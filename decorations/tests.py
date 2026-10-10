import json
import tempfile
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from decorations.models import Decoration, DecorationSkill
from skills.models import Skill

DROP_RATES = {"mysterious": 2.742, "glowing": 2.097, "worn": 0.323, "warped": 0.0}

DATA = {
    "decorations": [
        {
            "name": "Antiblast Jewel 1",
            "slot": 1,
            "rarity": 5,
            "skills": [{"name": "Blast Resistance", "level": 1}],
            "note": None,
            "drop_rates": DROP_RATES,
        },
        {
            "name": "Shield/Antiblast Jewel 4",
            "slot": 4,
            "rarity": 11,
            "skills": [
                {"name": "Guard Up", "level": 1},
                {"name": "Blast Resistance", "level": 2},
            ],
            "note": "only obtainable once",
            "drop_rates": {"mysterious": 0.0},
        },
    ]
}


class LoadDecorationsTests(TestCase):
    def test_load_is_idempotent_links_skills_and_stubs_unknown(self):
        blast = Skill.objects.create(
            name="Blast Resistance",
            url="https://example.com/Blast_Resistance",
            icon_url="https://example.com/blast-resistance.png",
            description="Grants protection against blastblight.",
            max_level=3,
        )

        first, second = StringIO(), StringIO()
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump(DATA, f)
            f.flush()
            call_command("load_decorations", f.name, stdout=first)
            call_command("load_decorations", f.name, stdout=second)

        self.assertEqual(Decoration.objects.count(), 2)
        self.assertEqual(DecorationSkill.objects.count(), 3)
        self.assertIn("decorations: 2 created, 0 updated; 3 skill links", first.getvalue())
        self.assertIn("stubbed skills: Guard Up", first.getvalue())
        self.assertIn("decorations: 0 created, 2 updated; 3 skill links", second.getvalue())
        self.assertNotIn("stubbed", second.getvalue())

        antiblast = Decoration.objects.get(name="Antiblast Jewel 1")
        self.assertEqual(antiblast.slot, 1)
        self.assertEqual(antiblast.rarity, 5)
        self.assertEqual(antiblast.note, "")
        self.assertEqual(antiblast.drop_rates, DROP_RATES)
        self.assertEqual(antiblast.decoration_skills.get().level, 1)

        combo = Decoration.objects.get(name="Shield/Antiblast Jewel 4")
        self.assertEqual(combo.note, "only obtainable once")
        self.assertEqual(combo.decoration_skills.get(skill=blast).level, 2)
        self.assertEqual(list(blast.decorations.all()), [antiblast, combo])

        # unknown skill is stubbed once, not once per run
        guard_up = Skill.objects.get(name="Guard Up")
        self.assertEqual(guard_up.url, "")
        self.assertEqual(guard_up.max_level, 1)
        self.assertEqual(list(guard_up.decorations.all()), [combo])
        self.assertEqual(Skill.objects.count(), 2)
