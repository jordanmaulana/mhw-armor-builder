import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from armors.models import Armor
from skills.models import SetBonus


class Command(BaseCommand):
    help = (
        "Link armors to their set bonus and give each bonus its piece thresholds, from the "
        "scraped set list. Run after load_skills and load_armors. Safe to re-run: relinks "
        "from scratch."
    )

    def add_arguments(self, parser):
        parser.add_argument("path", nargs="?", default=settings.BASE_DIR / ".dataset" / "sets.json")

    @transaction.atomic
    def handle(self, *args, **options):
        data = json.loads(Path(options["path"]).read_text(encoding="utf-8"))
        bonuses = SetBonus.objects.in_bulk(field_name="name")

        # from scratch, so a bonus or piece the file dropped doesn't keep its old link
        SetBonus.objects.update(tiers=[])
        Armor.objects.update(set_bonus=None)

        linked = 0
        pieces = set()
        try:
            for row in data["set_bonuses"]:
                SetBonus.objects.filter(pk=bonuses[row["name"]].pk).update(tiers=row["tiers"])

            for row in data["sets"]:
                pieces.update(row["pieces"])
                if row["set_bonus"]:
                    linked += Armor.objects.filter(name__in=row["pieces"]).update(
                        set_bonus=bonuses[row["set_bonus"]]
                    )
        except KeyError as e:
            raise CommandError(f"{options['path']}: {e!r}") from e

        # the wiki lists a few pieces the armor pages don't; they link once the dataset has them
        missing = len(pieces - set(Armor.objects.values_list("name", flat=True)))
        self.stdout.write(
            self.style.SUCCESS(
                f"sets: {len(data['sets'])}; {linked} armors linked to a set bonus; "
                f"{missing} pieces not in the armor dataset"
            )
        )
