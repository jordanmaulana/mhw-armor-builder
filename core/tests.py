from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from armors.models import Armor
from charms.models import Charm
from decorations.models import Decoration
from skills.models import Skill


class SeedTests(TestCase):
    def test_seed_loads_every_dataset_skills_first(self):
        out = StringIO()
        call_command("seed", stdout=out)

        for model in (Skill, Charm, Decoration, Armor):
            self.assertTrue(model.objects.exists(), model.__name__)
        self.assertTrue(out.getvalue().startswith("skills:"))
