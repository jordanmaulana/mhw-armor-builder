import json
import tempfile
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from weapons.models import Weapon

DATA = {
    "type": "great_sword",
    "weapons": [
        {
            "name": "Black Fatalis Blade",
            "url": "https://example.com/Black_Fatalis_Blade",
            "rarity": 12,
            "attack": 1632,
            "affinity": -30,
            "defense": 0,
            "slots": [4, 4],
            "elements": [{"type": "dragon", "damage": 180}],
            "element_hidden": False,
            "elderseal": "high",
            "sharpness": [160, 20, 20, 70, 40, 30, 10],
            "sharpness_max": [160, 20, 20, 70, 40, 30, 60],
            "skill": "",
        },
        {
            "name": "Gold Sleep Fellsword",
            "url": "",
            "rarity": 10,
            "attack": 1104,
            "affinity": 0,
            "defense": 50,
            "slots": [],
            "elements": [{"type": "sleep", "damage": 300}],
            "element_hidden": True,
            "elderseal": "",
            "sharpness": [120, 120, 40, 50, 70, 0, 0],
            "sharpness_max": [120, 120, 40, 50, 70, 0, 0],
            "skill": "Kulve Taroth Essence",
        },
    ],
}


class LoadWeaponsTests(TestCase):
    def load(self, data, stdout):
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump(data, f)
            f.flush()
            call_command("load_weapons", f.name, stdout=stdout)

    def test_load_is_idempotent_and_takes_what_the_file_changed(self):
        first, second = StringIO(), StringIO()
        self.load(DATA, first)
        sharper = {**DATA["weapons"][0], "attack": 1700, "slots": [4]}
        self.load({**DATA, "weapons": [sharper, DATA["weapons"][1]]}, second)

        self.assertEqual(Weapon.objects.count(), 2)
        self.assertIn("weapons (great_sword): 2 created, 0 updated", first.getvalue())
        self.assertIn("weapons (great_sword): 0 created, 2 updated", second.getvalue())

        blade = Weapon.objects.get(name="Black Fatalis Blade")
        self.assertEqual(blade.type, Weapon.Type.GREAT_SWORD)
        self.assertEqual((blade.attack, blade.slots), (1700, [4]))
        self.assertEqual((blade.rarity, blade.affinity, blade.elderseal), (12, -30, "high"))
        self.assertEqual(blade.elements, [{"type": "dragon", "damage": 180}])
        self.assertEqual(blade.sharpness_max, [160, 20, 20, 70, 40, 30, 60])

        gold = Weapon.objects.get(name="Gold Sleep Fellsword")
        self.assertEqual((gold.url, gold.defense, gold.slots), ("", 50, []))
        self.assertTrue(gold.element_hidden)
        self.assertEqual(gold.skill, "Kulve Taroth Essence")

    def test_unknown_type_loads_nothing(self):
        with self.assertRaises(CommandError):
            self.load({**DATA, "type": "tonfa"}, StringIO())

        self.assertEqual(Weapon.objects.count(), 0)

    def test_row_missing_a_field_loads_nothing(self):
        no_slots = {k: v for k, v in DATA["weapons"][1].items() if k != "slots"}

        with self.assertRaises(CommandError):
            self.load({**DATA, "weapons": [DATA["weapons"][0], no_slots]}, StringIO())

        # the row before it was rolled back too
        self.assertEqual(Weapon.objects.count(), 0)

    def test_default_loads_every_weapon_type_from_the_dataset(self):
        call_command("load_weapons", stdout=StringIO())

        self.assertEqual(
            set(Weapon.objects.values_list("type", flat=True)), set(Weapon.Type.values)
        )
