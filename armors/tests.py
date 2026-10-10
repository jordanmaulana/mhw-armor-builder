import json
import tempfile
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from armors.models import Armor, ArmorSkill
from skills.models import Skill

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
        },
    ],
}


class LoadArmorsTests(TestCase):
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
        self.assertIn("armors (head): 2 created, 0 updated; 2 skill links", first.getvalue())
        self.assertIn("stubbed skills: Guts", first.getvalue())
        self.assertIn("armors (head): 0 created, 2 updated; 2 skill links", second.getvalue())
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

        ryu = Armor.objects.get(name="Ryu's Head")
        self.assertEqual(ryu.icon_url_male, "")
        self.assertEqual(ryu.icon_url_female, "")
        self.assertIsNone(ryu.rarity)
        self.assertEqual(ryu.slots, [])

        # unknown skill is stubbed once, not once per run
        guts = Skill.objects.get(name="Guts")
        self.assertEqual(guts.max_level, 1)
        self.assertEqual(list(ryu.skills.all()), [guts])
        self.assertEqual(Skill.objects.count(), 2)

    def test_unknown_type_loads_nothing(self):
        with self.assertRaises(CommandError):
            self.load({**DATA, "type": "hat"}, StringIO())

        self.assertEqual(Armor.objects.count(), 0)

    def test_default_loads_every_armor_type_from_the_dataset(self):
        out = StringIO()
        call_command("load_skills", stdout=StringIO())
        call_command("load_armors", stdout=out)

        self.assertEqual(set(Armor.objects.values_list("type", flat=True)), set(Armor.Type.values))
        # every skill an armor grants is a real one from skills.json
        self.assertNotIn("stubbed", out.getvalue())
