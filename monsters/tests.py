import copy
import json
import tempfile
from contextlib import ExitStack
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import Sum
from django.test import TestCase

from items.models import Item
from monsters.models import Monster, MonsterDrop

ITEMS = ("Barroth Shell", "Barroth Ridge", "Barroth Scalp")

LARGE = {
    "type": "large",
    "monsters": [
        {
            "name": "Barroth",
            "url": "https://example.com/Barroth",
            "icon_url": "https://example.com/barroth.png",
            "species": "brute_wyvern",
            "weaknesses": [
                {
                    "condition": "",
                    "fire": 3,
                    "water": 0,
                    "thunder": 0,
                    "ice": 2,
                    "dragon": 1,
                    "poison": 3,
                    "sleep": 2,
                    "paralysis": 3,
                    "blast": 3,
                    "stun": 1,
                },
                {
                    "condition": "covered in mud",
                    "fire": 0,
                    "water": 3,
                    "thunder": 0,
                    "ice": 2,
                    "dragon": 1,
                    "poison": 3,
                    "sleep": 2,
                    "paralysis": 3,
                    "blast": 3,
                    "stun": 1,
                },
            ],
            "drops": [
                {
                    "rank": "low",
                    "method": "carve",
                    "part": "",
                    "items": [
                        {"name": "Barroth Shell", "quantity": 1, "chance": 76},
                        {"name": "Barroth Ridge", "quantity": 1, "chance": 24},
                    ],
                },
                {
                    "rank": "low",
                    "method": "carve",
                    "part": "head shell",
                    "items": [{"name": "Barroth Scalp", "quantity": 1, "chance": 100}],
                },
                {
                    # one item twice in one table
                    "rank": "high",
                    "method": "break",
                    "part": "hindlegs",
                    "items": [
                        {"name": "Barroth Shell", "quantity": 1, "chance": 70},
                        {"name": "Barroth Shell", "quantity": 2, "chance": 30},
                    ],
                },
            ],
        }
    ],
}

SMALL = {
    "type": "small",
    "monsters": [
        {
            "name": "Gajalaka",
            "url": "https://example.com/Gajalaka",
            "icon_url": "",
            "species": "lynian",
            "weaknesses": [],
            "drops": [],
        }
    ],
}


class LoadMonstersTests(TestCase):
    def setUp(self):
        for name in ITEMS:
            Item.objects.create(name=name, rarity=4, sell_price=100)

    def load(self, *files, stdout):
        with ExitStack() as stack:
            paths = []
            for data in files:
                f = stack.enter_context(tempfile.NamedTemporaryFile("w", suffix=".json"))
                json.dump(data, f)
                f.flush()
                paths.append(f.name)
            call_command("load_monsters", *paths, stdout=stdout)

    def test_load_is_idempotent_rebuilds_drops_and_takes_what_the_file_changed(self):
        first, second = StringIO(), StringIO()
        self.load(LARGE, SMALL, stdout=first)
        changed = copy.deepcopy(LARGE)
        barroth = changed["monsters"][0]
        barroth["icon_url"] = ""
        barroth["drops"][0]["items"] = [{"name": "Barroth Shell", "quantity": 1, "chance": 100}]
        self.load(changed, stdout=second)

        self.assertEqual(Monster.objects.count(), 2)
        self.assertIn("monsters (large): 1 created, 0 updated; 5 drops", first.getvalue())
        self.assertIn("monsters (small): 1 created, 0 updated; 0 drops", first.getvalue())
        self.assertIn("monsters (large): 0 created, 1 updated; 4 drops", second.getvalue())
        # the second file's drops only: the first run's were replaced, not added to
        self.assertEqual(MonsterDrop.objects.count(), 4)

        barroth = Monster.objects.get(name="Barroth")
        self.assertEqual(
            (barroth.type, barroth.species),
            (Monster.Type.LARGE, Monster.Species.BRUTE_WYVERN),
        )
        self.assertEqual((barroth.url, barroth.icon_url), ("https://example.com/Barroth", ""))
        self.assertEqual([form["condition"] for form in barroth.weaknesses], ["", "covered in mud"])
        self.assertEqual(barroth.weaknesses[1]["water"], 3)
        carve = barroth.drops.get(method=MonsterDrop.Method.CARVE, part="")
        self.assertEqual(
            (carve.item.name, carve.rank, carve.quantity, carve.chance),
            ("Barroth Shell", MonsterDrop.Rank.LOW, 1, 100),
        )
        self.assertEqual(
            sorted(
                barroth.drops.filter(method=MonsterDrop.Method.BREAK).values_list(
                    "item__name", "part", "quantity", "chance"
                )
            ),
            [("Barroth Shell", "hindlegs", 1, 70), ("Barroth Shell", "hindlegs", 2, 30)],
        )
        # the link reads from the item's side too
        self.assertEqual(Item.objects.get(name="Barroth Scalp").drops.get().monster, barroth)

        gajalaka = Monster.objects.get(name="Gajalaka")
        self.assertEqual(
            (gajalaka.type, gajalaka.icon_url, gajalaka.weaknesses),
            (Monster.Type.SMALL, "", []),
        )
        self.assertFalse(gajalaka.drops.exists())

    def test_unknown_item_loads_nothing_and_stubs_nothing(self):
        unknown = copy.deepcopy(LARGE)
        unknown["monsters"][0]["drops"][1]["items"][0]["name"] = "Barroth Crown"

        with self.assertRaises(CommandError):
            self.load(SMALL, unknown, stdout=StringIO())

        # the file before it was rolled back too
        self.assertEqual(Monster.objects.count(), 0)
        self.assertEqual(MonsterDrop.objects.count(), 0)
        self.assertEqual(Item.objects.count(), len(ITEMS))

    def test_unknown_type_species_rank_or_method_loads_nothing(self):
        def changed(**keys):
            data = copy.deepcopy(LARGE)
            data.update({k: v for k, v in keys.items() if k == "type"})
            data["monsters"][0].update({k: v for k, v in keys.items() if k == "species"})
            table = data["monsters"][0]["drops"][0]
            table.update({k: v for k, v in keys.items() if k in ("rank", "method")})
            return data

        for key, value in (
            ("type", "medium"),
            ("species", "wyvern"),
            ("rank", "g"),
            ("method", "steal"),
        ):
            with self.subTest(key):
                with self.assertRaises(CommandError):
                    self.load(changed(**{key: value}), stdout=StringIO())

                self.assertEqual(Monster.objects.count(), 0)
                self.assertEqual(MonsterDrop.objects.count(), 0)

    def test_drop_missing_a_field_loads_nothing(self):
        no_chance = copy.deepcopy(LARGE)
        del no_chance["monsters"][0]["drops"][2]["items"][1]["chance"]

        with self.assertRaises(CommandError):
            self.load(no_chance, stdout=StringIO())

        self.assertEqual(Monster.objects.count(), 0)
        self.assertEqual(MonsterDrop.objects.count(), 0)

    def test_default_loads_the_dataset(self):
        call_command("load_items", stdout=StringIO())
        call_command("load_monsters", stdout=StringIO())

        self.assertEqual(
            set(Monster.objects.values_list("type", flat=True)), set(Monster.Type.values)
        )
        for field, enum in (("rank", MonsterDrop.Rank), ("method", MonsterDrop.Method)):
            with self.subTest(field):
                self.assertEqual(
                    set(MonsterDrop.objects.values_list(field, flat=True)), set(enum.values)
                )

        # no drops: the two lynians, whose item tables no source labels
        self.assertEqual(
            set(Monster.objects.filter(drops__isnull=True).values_list("name", flat=True)),
            {"Boaboa", "Gajalaka"},
        )

        # a table adds up to 100, all but two: the game keeps two tables under each of Shara
        # Ishvalda's leg mantles and nothing says which break pays which
        off = (
            MonsterDrop.objects.values("monster__name", "rank", "method", "part")
            .annotate(total=Sum("chance"))
            .exclude(total=100)
        )
        self.assertEqual(
            {(table["monster__name"], table["part"], table["total"]) for table in off},
            {
                ("Shara Ishvalda", "left leg mantle", 200),
                ("Shara Ishvalda", "right leg mantle", 200),
            },
        )

        # a part is what a carve, a break or a mine names, and the last two always name one
        self.assertEqual(
            set(MonsterDrop.objects.exclude(part="").values_list("method", flat=True)),
            {MonsterDrop.Method.CARVE, MonsterDrop.Method.BREAK, MonsterDrop.Method.MINE},
        )
        self.assertFalse(
            MonsterDrop.objects.filter(
                method__in=(MonsterDrop.Method.BREAK, MonsterDrop.Method.MINE), part=""
            ).exists()
        )

        keys = set(LARGE["monsters"][0]["weaknesses"][0])
        for monster in Monster.objects.all():
            with self.subTest(monster.name):
                if monster.type == Monster.Type.SMALL:
                    self.assertEqual(monster.weaknesses, [])
                    continue
                self.assertTrue(monster.weaknesses)
                for form in monster.weaknesses:
                    self.assertEqual(set(form), keys)
                    stars = [value for key, value in form.items() if key != "condition"]
                    self.assertTrue(all(value in (0, 1, 2, 3) for value in stars))

        # two values MHWorldData has otherwise, each settled by two sources against it
        velkhana = MonsterDrop.objects.get(
            monster__name="Velkhana",
            method=MonsterDrop.Method.INVESTIGATION_PURPLE,
            item__name="Sealed Feystone",
        )
        self.assertEqual(velkhana.chance, 80)
        anjanath = Monster.objects.get(name="Anjanath").weaknesses[0]
        self.assertEqual((anjanath["dragon"], anjanath["poison"]), (1, 2))
