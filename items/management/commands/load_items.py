import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from items.models import Item

# a dataset row's keys, which are the model's fields
FIELDS = ("url", "rarity", "sell_price", "gathered")


class Command(BaseCommand):
    help = "Load items from a scraped dataset file. Safe to re-run: upserts on name."

    def add_arguments(self, parser):
        parser.add_argument(
            "path", nargs="?", default=settings.BASE_DIR / ".dataset" / "items.json"
        )

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            message = self.load_file(options["path"])
        except (KeyError, ValueError) as e:
            raise CommandError(f"{options['path']}: {e!r}") from e

        self.stdout.write(self.style.SUCCESS(message))

    def load_file(self, path):
        data = json.loads(Path(path).read_text(encoding="utf-8"))

        items_created = 0
        for row in data["items"]:
            _, created = Item.objects.update_or_create(
                name=row["name"], defaults={field: row[field] for field in FIELDS}
            )
            items_created += created

        return f"items: {items_created} created, {len(data['items']) - items_created} updated"
