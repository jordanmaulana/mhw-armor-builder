import json
import tempfile
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from skills.models import SetBonus, Skill

DATA = {
    "skills": [
        {
            "name": "Agitator",
            "url": "https://example.com/Agitator",
            "icon_url": "https://example.com/agitator.png",
            "description": "Increases attack power when monsters become enraged.",
            "max_level": 5,
            "secret": {"name": "Agitator Secret", "max_level": 7},
            "levels": [{"level": 1, "effect": "Attack +4"}],
        },
        {
            "name": "Airborne",
            "url": "https://example.com/Airborne",
            "icon_url": "https://example.com/airborne.png",
            "description": "Increases the damage caused by jumping attacks.",
            "max_level": 1,
            "secret": None,
            "levels": [],
        },
    ],
    "set_bonuses": [
        {
            "name": "Anjanath Power",
            "url": "https://example.com/Anjanath_Power",
            "icon_url": "https://example.com/anjanath-power.png",
            "requirement": "Adds Adrenaline when 3 pieces of Anja Armor Set are equipped",
            "effects": ["Temporarily reduces stamina depletion."],
        }
    ],
}


class LoadSkillsTests(TestCase):
    def test_load_is_idempotent_and_maps_secret(self):
        out = StringIO()
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump(DATA, f)
            f.flush()
            call_command("load_skills", f.name, stdout=StringIO())
            call_command("load_skills", f.name, stdout=out)

        self.assertEqual(Skill.objects.count(), 2)
        self.assertEqual(SetBonus.objects.count(), 1)
        self.assertIn("skills: 0 created, 2 updated", out.getvalue())
        self.assertIn("set bonuses: 0 created, 1 updated", out.getvalue())

        agitator = Skill.objects.get(name="Agitator")
        self.assertEqual(agitator.secret_name, "Agitator Secret")
        self.assertEqual(agitator.secret_max_level, 7)
        self.assertEqual(agitator.levels, [{"level": 1, "effect": "Attack +4"}])

        airborne = Skill.objects.get(name="Airborne")
        self.assertEqual(airborne.secret_name, "")
        self.assertIsNone(airborne.secret_max_level)

        self.assertEqual(
            SetBonus.objects.get(name="Anjanath Power").effects,
            ["Temporarily reduces stamina depletion."],
        )

    def test_default_loads_the_dataset_with_a_line_for_every_level(self):
        call_command("load_skills", stdout=StringIO())

        lines = 0
        for skill in Skill.objects.all():
            with self.subTest(skill=skill.name):
                # a skill with a secret has its levels past max_level too
                top = skill.secret_max_level or skill.max_level
                self.assertEqual([row["level"] for row in skill.levels], list(range(1, top + 1)))
                self.assertTrue(all(row["effect"] for row in skill.levels))
                lines += len(skill.levels)
        self.assertEqual(lines, 363)

        def line(name, level):
            return Skill.objects.get(name=name).levels[level - 1]["effect"]

        self.assertEqual(line("Critical Eye", 3), "Affinity +15%")
        self.assertEqual(
            line("Agitator", 7), "While active, grants attack +28 and increases affinity by 20%."
        )
        # the wiki's page stops at 3
        self.assertEqual(line("Sleep Attack", 4), "Sleep buildup +30% Bonus: +10")
        # the game's own line is "Activates skill effect.": the description stands in for it
        self.assertEqual(line("Coldproof", 1), "Nullifies the effects of cold weather.")
