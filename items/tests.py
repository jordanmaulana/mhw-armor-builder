import json
import tempfile
from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from items.models import Item

DATA = {
    "items": [
        {
            "name": "Rathalos Ruby",
            "url": "https://example.com/Rathalos_Ruby",
            "rarity": 7,
            "sell_price": 7200,
        },
        {"name": "Carved Feystone", "url": "", "rarity": 10, "sell_price": 0},
    ]
}


class LoadItemsTests(TestCase):
    def load(self, data, stdout):
        with tempfile.NamedTemporaryFile("w", suffix=".json") as f:
            json.dump(data, f)
            f.flush()
            call_command("load_items", f.name, stdout=stdout)

    def test_load_is_idempotent_and_takes_what_the_file_changed(self):
        first, second = StringIO(), StringIO()
        self.load(DATA, first)
        dearer = {**DATA["items"][0], "sell_price": 9000}
        self.load({"items": [dearer, DATA["items"][1]]}, second)

        self.assertEqual(Item.objects.count(), 2)
        self.assertIn("items: 2 created, 0 updated", first.getvalue())
        self.assertIn("items: 0 created, 2 updated", second.getvalue())

        ruby = Item.objects.get(name="Rathalos Ruby")
        self.assertEqual((ruby.rarity, ruby.sell_price), (7, 9000))
        self.assertEqual(ruby.url, "https://example.com/Rathalos_Ruby")

        feystone = Item.objects.get(name="Carved Feystone")
        self.assertEqual((feystone.url, feystone.rarity, feystone.sell_price), ("", 10, 0))

    def test_row_missing_a_field_loads_nothing(self):
        no_rarity = {k: v for k, v in DATA["items"][1].items() if k != "rarity"}

        with self.assertRaises(CommandError):
            self.load({"items": [DATA["items"][0], no_rarity]}, StringIO())

        # the row before it was rolled back too
        self.assertEqual(Item.objects.count(), 0)

    def test_default_loads_the_dataset_under_the_games_names(self):
        call_command("load_items", stdout=StringIO())

        path = settings.BASE_DIR / ".dataset" / "items.json"
        rows = json.loads(path.read_text(encoding="utf-8"))["items"]
        # the loader upserts on name, so a name the file repeats would come up short here
        self.assertEqual(Item.objects.count(), len(rows))

        # the wiki's Rathalos page calls it Rathalos Wingtalon+
        self.assertTrue(Item.objects.filter(name="Rath Wingtalon+").exists())
        self.assertFalse(Item.objects.filter(name__startswith="Rathalos Wingtalon").exists())
