from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from armors.models import Armor, ArmorMaterial
from charms.models import Charm
from decorations.models import Decoration
from items.models import Item
from monsters.models import Monster, MonsterDrop
from skills.models import Skill
from weapons.models import Weapon


class SeedTests(TestCase):
    def test_seed_loads_every_dataset_skills_first(self):
        out = StringIO()
        call_command("seed", stdout=out)

        for model in (
            Skill,
            Charm,
            Decoration,
            Armor,
            ArmorMaterial,
            Weapon,
            Item,
            Monster,
            MonsterDrop,
        ):
            self.assertTrue(model.objects.exists(), model.__name__)
        self.assertTrue(out.getvalue().startswith("skills:"))
        self.assertTrue(Armor.objects.filter(set_bonus__isnull=False).exists())
