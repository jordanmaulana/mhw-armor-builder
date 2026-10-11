import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from weapons.models import Weapon

# a dataset row's keys, which are the model's fields
FIELDS = (
    "url",
    "rarity",
    "attack",
    "affinity",
    "defense",
    "slots",
    "elements",
    "element_hidden",
    "elderseal",
    "sharpness",
    "sharpness_max",
    "skill",
)


class Command(BaseCommand):
    help = (
        "Load weapons from scraped dataset files (default: every .dataset/weapon_*.json); each "
        "file's type key says which weapon type. Safe to re-run: upserts on name."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "paths",
            nargs="*",
            default=sorted((settings.BASE_DIR / ".dataset").glob("weapon_*.json")),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        messages = []
        for path in options["paths"]:
            try:
                messages.append(self.load_file(path))
            except (KeyError, ValueError) as e:
                raise CommandError(f"{path}: {e!r}") from e

        # written only once every file is in, so a rollback leaves no "created" lines behind
        for message in messages:
            self.stdout.write(self.style.SUCCESS(message))

    def load_file(self, path):
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        weapon_type = Weapon.Type(data["type"])  # ValueError on a type we don't know

        weapons_created = 0
        for row in data["weapons"]:
            _, created = Weapon.objects.update_or_create(
                name=row["name"],
                defaults={"type": weapon_type, **{field: row[field] for field in FIELDS}},
            )
            weapons_created += created

        return (
            f"weapons ({weapon_type}): {weapons_created} created, "
            f"{len(data['weapons']) - weapons_created} updated"
        )
