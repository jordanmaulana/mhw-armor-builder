import copy
import json
import tempfile
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import Count
from django.test import TestCase

from armors.models import Armor, ArmorMaterial, ArmorSkill
from items.models import Item
from skills.models import SetBonus, Skill

ITEMS = ["Lunastra Ticket", "Lunastra Mane"]

DATA = {
    "type": "head",
    "armors": [
        {
            "name": "Empress Crown Gamma",
            "url": "https://example.com/Empress_Crown_Gamma",
            "icon_url_male": "https://example.com/empress-crown-male.png",
            "icon_url_female": "https://example.com/empress-crown-female.png",
            "rarity": 8,
            "defense": 70,
            "slots": [1, 1, 1],
            "skills": [{"name": "Wide-Range", "url": "https://example.com/Wide-Range", "level": 2}],
            "resistances": {"fire": 3, "water": 1, "thunder": 1, "ice": -3, "dragon": 2},
            "materials": [
                {"name": "Lunastra Ticket", "quantity": 1},
                {"name": "Lunastra Mane", "quantity": 2},
            ],
        },
        {
            "name": "Ryu's Head",
            "url": "https://example.com/Ryu%27s_Head",
            "icon_url_male": None,
            "icon_url_female": None,
            "rarity": None,
            "defense": 22,
            "slots": [],
            "skills": [{"name": "Guts", "url": "https://example.com/Guts", "level": 1}],
            "resistances": {"fire": 0, "water": 0, "thunder": 0, "ice": 0, "dragon": 0},
            "materials": [],
        },
    ],
}


class LoadArmorsTests(TestCase):
    def setUp(self):
        for name in ITEMS:
            Item.objects.create(name=name, rarity=7, sell_price=100)

    def load(self, data, stdout):
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump(data, f)
            f.flush()
            call_command("load_armors", f.name, stdout=stdout)

    def test_load_is_idempotent_links_skills_and_stubs_unknown(self):
        wide_range = Skill.objects.create(
            name="Wide-Range",
            url="https://example.com/Wide-Range",
            icon_url="https://example.com/wide-range.png",
            description="Allows the effects of certain items to also affect nearby allies.",
            max_level=5,
        )

        first, second = StringIO(), StringIO()
        self.load(DATA, first)
        self.load(DATA, second)

        self.assertEqual(Armor.objects.count(), 2)
        self.assertEqual(ArmorSkill.objects.count(), 2)
        self.assertEqual(ArmorMaterial.objects.count(), 2)
        self.assertIn(
            "armors (head): 2 created, 0 updated; 2 skill links; 2 materials", first.getvalue()
        )
        self.assertIn("stubbed skills: Guts", first.getvalue())
        self.assertIn(
            "armors (head): 0 created, 2 updated; 2 skill links; 2 materials", second.getvalue()
        )
        self.assertNotIn("stubbed", second.getvalue())

        crown = Armor.objects.get(name="Empress Crown Gamma")
        self.assertEqual(crown.type, Armor.Type.HEAD)
        self.assertEqual(crown.rarity, 8)
        self.assertEqual(crown.defense, 70)
        self.assertEqual(crown.slots, [1, 1, 1])
        self.assertEqual(crown.icon_url_female, "https://example.com/empress-crown-female.png")
        self.assertEqual(
            (crown.fire_res, crown.water_res, crown.thunder_res, crown.ice_res, crown.dragon_res),
            (3, 1, 1, -3, 2),
        )
        self.assertEqual(crown.armor_skills.get().level, 2)
        self.assertEqual(list(wide_range.armors.all()), [crown])
        # in the file's order, which is not the names'
        self.assertEqual(
            list(crown.materials.values_list("item__name", "quantity")),
            [("Lunastra Ticket", 1), ("Lunastra Mane", 2)],
        )
        mane = Item.objects.get(name="Lunastra Mane")
        self.assertEqual(mane.armor_materials.get().armor, crown)

        ryu = Armor.objects.get(name="Ryu's Head")
        self.assertEqual(ryu.icon_url_male, "")
        self.assertEqual(ryu.icon_url_female, "")
        self.assertIsNone(ryu.rarity)
        self.assertEqual(ryu.slots, [])
        self.assertFalse(ryu.materials.exists())

        # unknown skill is stubbed once, not once per run
        guts = Skill.objects.get(name="Guts")
        self.assertEqual(guts.max_level, 1)
        self.assertEqual(list(ryu.skills.all()), [guts])
        self.assertEqual(Skill.objects.count(), 2)

    def test_reload_replaces_a_recipe_and_empties_one_the_file_no_longer_has(self):
        changed = copy.deepcopy(DATA)
        changed["armors"][0]["materials"] = [{"name": "Lunastra Mane", "quantity": 5}]
        emptied = copy.deepcopy(DATA)
        emptied["armors"][0]["materials"] = []

        self.load(DATA, StringIO())
        self.load(changed, StringIO())

        crown = Armor.objects.get(name="Empress Crown Gamma")
        # the second file's lines only: the first run's were replaced, not added to
        self.assertEqual(
            list(crown.materials.values_list("item__name", "quantity")), [("Lunastra Mane", 5)]
        )

        self.load(emptied, StringIO())

        self.assertEqual(ArmorMaterial.objects.count(), 0)

    def test_unknown_type_loads_nothing(self):
        with self.assertRaises(CommandError):
            self.load({**DATA, "type": "hat"}, StringIO())

        self.assertEqual(Armor.objects.count(), 0)

    def test_unknown_item_loads_nothing_and_stubs_nothing(self):
        unknown = copy.deepcopy(DATA)
        unknown["armors"][0]["materials"][1]["name"] = "Lunastra Hair"

        with self.assertRaises(CommandError):
            self.load(unknown, StringIO())

        self.assertEqual(Armor.objects.count(), 0)
        self.assertEqual(ArmorMaterial.objects.count(), 0)
        self.assertEqual(Item.objects.count(), len(ITEMS))
        # the skill stubbed on the way was rolled back too
        self.assertEqual(Skill.objects.count(), 0)

    def test_row_missing_materials_loads_nothing(self):
        no_materials = {k: v for k, v in DATA["armors"][1].items() if k != "materials"}

        with self.assertRaises(CommandError):
            self.load({**DATA, "armors": [DATA["armors"][0], no_materials]}, StringIO())

        # the row before it was rolled back too
        self.assertEqual(Armor.objects.count(), 0)
        self.assertEqual(ArmorMaterial.objects.count(), 0)

    def test_default_loads_every_armor_type_from_the_dataset(self):
        out = StringIO()
        call_command("load_skills", stdout=StringIO())
        call_command("load_items", stdout=StringIO())
        call_command("load_armors", stdout=out)

        self.assertEqual(set(Armor.objects.values_list("type", flat=True)), set(Armor.Type.values))
        # every skill an armor grants is a real one from skills.json
        self.assertNotIn("stubbed", out.getvalue())

        # a recipe is one to four lines
        lines = Armor.objects.annotate(lines=Count("materials"))
        self.assertFalse(lines.filter(lines__gt=4).exists())
        self.assertFalse(ArmorMaterial.objects.filter(quantity=0).exists())
        # 14 handed out or forged for nothing, 33 the wiki lists and no source has a recipe for
        self.assertEqual(lines.filter(lines=0).count(), 47)
        self.assertEqual(
            list(
                Armor.objects.get(name="Rathalos Vambraces Beta").materials.values_list(
                    "item__name", "quantity"
                )
            ),
            [
                ("Rathalos Carapace", 6),
                ("Rathalos Wing", 2),
                ("Inferno Sac", 2),
                ("Rath Wingtalon", 6),
            ],
        )


SETS = {
    "set_bonuses": [
        {
            "name": "Anjanath Will",
            "tiers": [
                {"pieces": 2, "skill": "Adrenaline"},
                {"pieces": 4, "skill": "Stamina Cap Up"},
            ],
        }
    ],
    "sets": [
        {
            "name": "Anja Alpha Armor Set",
            "url": "https://example.com/Anja_Alpha_Armor_Set",
            "set_bonus": "Anjanath Will",
            # the second piece is one the armor dataset doesn't have
            "pieces": ["Anja Helm Alpha", "Aloy's Head Alpha"],
        },
        {
            "name": "Alloy Armor Set",
            "url": "https://example.com/Alloy_Armor_Set",
            "set_bonus": None,
            "pieces": ["Alloy Helm"],
        },
    ],
}


class LoadSetsTests(TestCase):
    def load(self, data, stdout):
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump(data, f)
            f.flush()
            call_command("load_sets", f.name, stdout=stdout)

    def bonus(self, name, **fields):
        return SetBonus.objects.create(
            name=name, url="https://example.com/bonus", icon_url="", requirement="", **fields
        )

    def armor(self, name, **fields):
        return Armor.objects.create(
            name=name,
            type=Armor.Type.HEAD,
            url="https://example.com/armor",
            defense=1,
            fire_res=0,
            water_res=0,
            thunder_res=0,
            ice_res=0,
            dragon_res=0,
            **fields,
        )

    def test_load_links_pieces_gives_tiers_and_drops_what_the_file_no_longer_says(self):
        will = self.bonus("Anjanath Will")
        stale = self.bonus("Rathalos Power", tiers=[{"pieces": 3, "skill": "Critical Element"}])
        self.armor("Anja Helm Alpha")
        self.armor("Alloy Helm")
        self.armor("Rathalos Helm", set_bonus=stale)  # linked by an older file

        first, second = StringIO(), StringIO()
        self.load(SETS, first)
        self.load(SETS, second)

        summary = "sets: 2; 1 armors linked to a set bonus; 1 pieces not in the armor dataset"
        self.assertIn(summary, first.getvalue())
        self.assertIn(summary, second.getvalue())

        self.assertEqual(Armor.objects.get(name="Anja Helm Alpha").set_bonus, will)
        self.assertIsNone(Armor.objects.get(name="Alloy Helm").set_bonus)
        self.assertIsNone(Armor.objects.get(name="Rathalos Helm").set_bonus)

        will.refresh_from_db()
        stale.refresh_from_db()
        self.assertEqual(will.tiers, SETS["set_bonuses"][0]["tiers"])
        self.assertEqual(stale.tiers, [])

    def test_unknown_set_bonus_changes_nothing(self):
        power = self.bonus("Rathalos Power", tiers=[{"pieces": 3, "skill": "Critical Element"}])
        self.armor("Rathalos Helm", set_bonus=power)

        with self.assertRaises(CommandError):
            self.load(SETS, StringIO())  # no "Anjanath Will" in the database

        power.refresh_from_db()
        self.assertEqual(power.tiers, [{"pieces": 3, "skill": "Critical Element"}])
        self.assertEqual(Armor.objects.get(name="Rathalos Helm").set_bonus, power)

    def test_default_links_the_dataset(self):
        for command in ("load_skills", "load_items", "load_armors", "load_sets"):
            call_command(command, stdout=StringIO())

        def bonus_of(name):
            return Armor.objects.get(name=name).set_bonus.name

        self.assertEqual(bonus_of("Anja Helm Alpha"), "Anjanath Will")
        # one bonus, pieces of four different sets
        for name in [
            "Rathalos Helm Alpha",
            "Rath Soul Mail Beta",
            "Azure Starlord Crown Alpha",
            "Ryu's Head Alpha",
        ]:
            self.assertEqual(bonus_of(name), "Rathalos Mastery")
        # the set page gives no usable bonus name here; it comes from the comparison table
        self.assertEqual(bonus_of("Xeno'jiiva Spine Gamma"), "Xeno'jiiva Divinity")
        self.assertIsNone(Armor.objects.get(name="Alloy Helm").set_bonus)

        # a linked bonus that never activates would be a dead link
        linked = SetBonus.objects.filter(armors__isnull=False).distinct()
        self.assertEqual([bonus.name for bonus in linked if not bonus.tiers], [])
        self.assertEqual(
            SetBonus.objects.get(name="Anjanath Will").tiers,
            [{"pieces": 2, "skill": "Adrenaline"}, {"pieces": 4, "skill": "Stamina Cap Up"}],
        )
