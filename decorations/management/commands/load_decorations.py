import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from decorations.models import Decoration, DecorationSkill
from skills.models import Skill


class Command(BaseCommand):
    help = "Load decorations from the scraped dataset. Safe to re-run: upserts on name."

    def add_arguments(self, parser):
        parser.add_argument(
            "path", nargs="?", default=settings.BASE_DIR / ".dataset" / "decorations.json"
        )

    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads(Path(options["path"]).read_text(encoding="utf-8"))
        skills = Skill.objects.in_bulk(field_name="name")

        decorations_created = 0
        links = []
        stubbed = []
        for row in data["decorations"]:
            decoration, created = Decoration.objects.update_or_create(
                name=row["name"],
                defaults={
                    "slot": row["slot"],
                    "rarity": row["rarity"],
                    "note": row["note"] or "",
                    "drop_rates": row["drop_rates"],
                },
            )
            decorations_created += created
            decoration.decoration_skills.all().delete()

            for granted in row["skills"]:
                name = granted["name"]
                if name not in skills:
                    # ponytail: set-bonus-only skills are absent from skills.json, so stub them
                    # with the level this decoration grants (the dataset has no skill url);
                    # load_skills upserts on name and fills the stub in if the dataset ever
                    # gains the skill
                    skills[name] = Skill.objects.create(
                        name=name,
                        url="",
                        icon_url="",
                        description="",
                        max_level=granted["level"],
                    )
                    stubbed.append(name)
                links.append(
                    DecorationSkill(
                        decoration=decoration, skill=skills[name], level=granted["level"]
                    )
                )

        DecorationSkill.objects.bulk_create(links)

        message = (
            f"decorations: {decorations_created} created, "
            f"{len(data['decorations']) - decorations_created} updated; "
            f"{len(links)} skill links"
        )
        if stubbed:
            message += f"; stubbed skills: {', '.join(stubbed)}"
        self.stdout.write(self.style.SUCCESS(message))
