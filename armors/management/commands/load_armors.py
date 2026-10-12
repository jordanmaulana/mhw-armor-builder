import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from armors.models import Armor, ArmorMaterial, ArmorSkill
from items.models import Item
from skills.models import Skill


class Command(BaseCommand):
    help = (
        "Load armors from scraped dataset files (default: every .dataset/armor_*.json); each "
        "file's type key says which part (head, chest, ...). Safe to re-run: upserts on name. "
        "Run load_items first: a recipe line naming an item that isn't loaded is an error."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "paths",
            nargs="*",
            default=sorted((settings.BASE_DIR / ".dataset").glob("armor_*.json")),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        skills = Skill.objects.in_bulk(field_name="name")
        items = Item.objects.in_bulk(field_name="name")

        messages = []
        for path in options["paths"]:
            try:
                messages.append(self.load_file(path, skills, items))
            except (KeyError, ValueError) as e:
                raise CommandError(f"{path}: {e!r}") from e

        # written only once every file is in, so a rollback leaves no "created" lines behind
        for message in messages:
            self.stdout.write(self.style.SUCCESS(message))

    def load_file(self, path, skills, items):
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        armor_type = Armor.Type(data["type"])  # ValueError on a part we don't know

        armors_created = 0
        links = []
        materials = []
        stubbed = []
        for row in data["armors"]:
            armor, created = Armor.objects.update_or_create(
                name=row["name"],
                defaults={
                    "type": armor_type,
                    "url": row["url"],
                    "icon_url_male": row["icon_url_male"] or "",
                    "icon_url_female": row["icon_url_female"] or "",
                    "rarity": row["rarity"],
                    "defense": row["defense"],
                    "slots": row["slots"],
                    **{f"{element}_res": value for element, value in row["resistances"].items()},
                },
            )
            armors_created += created
            armor.armor_skills.all().delete()
            armor.materials.all().delete()

            for granted in row["skills"]:
                name = granted["name"]
                if name not in skills:
                    # ponytail: skills absent from skills.json are stubbed with the level this
                    # armor grants; load_skills upserts on name and fills the stub in if the
                    # dataset ever gains the skill
                    skills[name] = Skill.objects.create(
                        name=name,
                        url=granted["url"] or "",
                        icon_url="",
                        description="",
                        max_level=granted["level"],
                    )
                    stubbed.append(name)
                links.append(ArmorSkill(armor=armor, skill=skills[name], level=granted["level"]))

            for line in row["materials"]:
                # no stub for an item we don't have, unlike a skill: see load_monsters
                materials.append(
                    ArmorMaterial(armor=armor, item=items[line["name"]], quantity=line["quantity"])
                )

        ArmorSkill.objects.bulk_create(links)
        ArmorMaterial.objects.bulk_create(materials)

        message = (
            f"armors ({armor_type}): {armors_created} created, "
            f"{len(data['armors']) - armors_created} updated; "
            f"{len(links)} skill links; {len(materials)} materials"
        )
        if stubbed:
            message += f"; stubbed skills: {', '.join(stubbed)}"
        return message
