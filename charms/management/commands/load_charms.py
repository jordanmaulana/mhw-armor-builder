import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from charms.models import Charm, CharmSkill
from skills.models import Skill


class Command(BaseCommand):
    help = "Load charms from the scraped dataset. Safe to re-run: upserts on name."

    def add_arguments(self, parser):
        parser.add_argument(
            "path", nargs="?", default=settings.BASE_DIR / ".dataset" / "charms.json"
        )

    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads(Path(options["path"]).read_text(encoding="utf-8"))
        skills = Skill.objects.in_bulk(field_name="name")

        charms_created = 0
        links = []
        stubbed = []
        for row in data["charms"]:
            charm, created = Charm.objects.update_or_create(
                name=row["name"],
                defaults={
                    "url": row["url"],
                    "icon_url": row["icon_url"] or "",
                    "rarity": row["rarity"],
                    "zenny": row["zenny"],
                    "obtained": row["obtained"] or "",
                    "materials": row["materials"],
                },
            )
            charms_created += created
            charm.charm_skills.all().delete()

            for granted in row["skills"]:
                name = granted["name"]
                if name not in skills:
                    # ponytail: set-bonus-only skills are absent from skills.json, so stub them
                    # with the level this charm grants; load_skills upserts on name and fills
                    # the stub in if the dataset ever gains the skill
                    skills[name] = Skill.objects.create(
                        name=name,
                        url=granted["url"],
                        icon_url="",
                        description="",
                        max_level=granted["level"],
                    )
                    stubbed.append(name)
                links.append(CharmSkill(charm=charm, skill=skills[name], level=granted["level"]))

        CharmSkill.objects.bulk_create(links)

        message = (
            f"charms: {charms_created} created, "
            f"{len(data['charms']) - charms_created} updated; "
            f"{len(links)} skill links"
        )
        if stubbed:
            message += f"; stubbed skills: {', '.join(stubbed)}"
        self.stdout.write(self.style.SUCCESS(message))
