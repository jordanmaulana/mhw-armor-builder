import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from items.models import Item
from monsters.models import Monster, MonsterDrop

# a dataset row's keys that are the model's fields as they stand
FIELDS = ("url", "icon_url", "weaknesses")


class Command(BaseCommand):
    help = (
        "Load monsters and their drops from scraped dataset files (default: every "
        ".dataset/monster_*.json); each file's type key says large or small. Run load_items "
        "first: a drop naming an item that isn't loaded is an error. Safe to re-run: upserts on "
        "name and rebuilds each monster's drops."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "paths",
            nargs="*",
            default=sorted((settings.BASE_DIR / ".dataset").glob("monster_*.json")),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        items = Item.objects.in_bulk(field_name="name")

        messages = []
        for path in options["paths"]:
            try:
                messages.append(self.load_file(path, items))
            except (KeyError, ValueError) as e:
                raise CommandError(f"{path}: {e!r}") from e

        # written only once every file is in, so a rollback leaves no "created" lines behind
        for message in messages:
            self.stdout.write(self.style.SUCCESS(message))

    def load_file(self, path, items):
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        monster_type = Monster.Type(data["type"])  # ValueError on a type we don't know

        monsters_created = 0
        drops = []
        for row in data["monsters"]:
            monster, created = Monster.objects.update_or_create(
                name=row["name"],
                defaults={
                    "type": monster_type,
                    "species": Monster.Species(row["species"]),
                    **{field: row[field] for field in FIELDS},
                },
            )
            monsters_created += created
            monster.drops.all().delete()

            for table in row["drops"]:
                rank = MonsterDrop.Rank(table["rank"])
                method = MonsterDrop.Method(table["method"])
                for entry in table["items"]:
                    drops.append(
                        MonsterDrop(
                            monster=monster,
                            # no stub for an item we don't have, unlike load_armors' skills: it
                            # would need a rarity and a price, and the usual cause is a wiki
                            # spelling (Rathalos Wingtalon+) that would become a second item
                            item=items[entry["name"]],
                            rank=rank,
                            method=method,
                            part=table["part"],
                            quantity=entry["quantity"],
                            chance=entry["chance"],
                        )
                    )

        MonsterDrop.objects.bulk_create(drops, batch_size=1000)

        return (
            f"monsters ({monster_type}): {monsters_created} created, "
            f"{len(data['monsters']) - monsters_created} updated; {len(drops)} drops"
        )
