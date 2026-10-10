import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from skills.models import SetBonus, Skill


class Command(BaseCommand):
    help = "Load skills and set bonuses from the scraped dataset. Safe to re-run: upserts on name."

    def add_arguments(self, parser):
        parser.add_argument(
            "path", nargs="?", default=settings.BASE_DIR / ".dataset" / "skills.json"
        )

    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads(Path(options["path"]).read_text(encoding="utf-8"))

        skills_created = 0
        for row in data["skills"]:
            secret = row["secret"] or {}
            _, created = Skill.objects.update_or_create(
                name=row["name"],
                defaults={
                    "url": row["url"],
                    "icon_url": row["icon_url"],
                    "description": row["description"],
                    "max_level": row["max_level"],
                    "secret_name": secret.get("name", ""),
                    "secret_max_level": secret.get("max_level"),
                    "levels": row["levels"],
                },
            )
            skills_created += created

        bonuses_created = 0
        for row in data["set_bonuses"]:
            _, created = SetBonus.objects.update_or_create(
                name=row["name"],
                defaults={
                    "url": row["url"],
                    "icon_url": row["icon_url"],
                    "requirement": row["requirement"],
                    "effects": row["effects"],
                },
            )
            bonuses_created += created

        self.stdout.write(
            self.style.SUCCESS(
                f"skills: {skills_created} created, "
                f"{len(data['skills']) - skills_created} updated; "
                f"set bonuses: {bonuses_created} created, "
                f"{len(data['set_bonuses']) - bonuses_created} updated"
            )
        )
