import json
import tempfile
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from charms.models import Charm, CharmSkill
from skills.models import Skill

MATERIALS = [{"name": "Anjanath Plate", "url": "https://example.com/Anjanath_Plate", "quantity": 1}]

DATA = {
    "charms": [
        {
            "name": "Artillery Charm I",
            "url": "https://example.com/Artillery_Charm_I",
            "icon_url": "https://example.com/artillery-charm.png",
            "rarity": 3,
            "skills": [{"name": "Artillery", "url": "https://example.com/Artillery", "level": 1}],
            "zenny": 1500,
            "materials": MATERIALS,
            "obtained": None,
        },
        {
            "name": "Gutsy Charm",
            "url": "https://example.com/Gutsy_Charm",
            "icon_url": None,
            "rarity": None,
            "skills": [{"name": "Guts", "url": "https://example.com/Guts", "level": 1}],
            "zenny": None,
            "materials": [],
            "obtained": "Obtained from a quest.",
        },
    ]
}


class LoadCharmsTests(TestCase):
    def test_load_is_idempotent_links_skills_and_stubs_unknown(self):
        artillery = Skill.objects.create(
            name="Artillery",
            url="https://example.com/Artillery",
            icon_url="https://example.com/artillery.png",
            description="Strengthens explosive attacks.",
            max_level=5,
        )

        first, second = StringIO(), StringIO()
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump(DATA, f)
            f.flush()
            call_command("load_charms", f.name, stdout=first)
            call_command("load_charms", f.name, stdout=second)

        self.assertEqual(Charm.objects.count(), 2)
        self.assertEqual(CharmSkill.objects.count(), 2)
        self.assertIn("charms: 2 created, 0 updated; 2 skill links", first.getvalue())
        self.assertIn("stubbed skills: Guts", first.getvalue())
        self.assertIn("charms: 0 created, 2 updated; 2 skill links", second.getvalue())
        self.assertNotIn("stubbed", second.getvalue())

        charm = Charm.objects.get(name="Artillery Charm I")
        self.assertEqual(charm.zenny, 1500)
        self.assertEqual(charm.materials, MATERIALS)
        self.assertEqual(charm.obtained, "")
        self.assertEqual(charm.charm_skills.get().level, 1)
        self.assertEqual(list(artillery.charms.all()), [charm])

        gutsy = Charm.objects.get(name="Gutsy Charm")
        self.assertEqual(gutsy.icon_url, "")
        self.assertIsNone(gutsy.rarity)
        self.assertIsNone(gutsy.zenny)
        self.assertEqual(gutsy.obtained, "Obtained from a quest.")

        # unknown skill is stubbed once, not once per run
        guts = Skill.objects.get(name="Guts")
        self.assertEqual(guts.max_level, 1)
        self.assertEqual(list(gutsy.skills.all()), [guts])
        self.assertEqual(Skill.objects.count(), 2)
