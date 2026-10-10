from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Load the whole scraped dataset. Safe to re-run: every loader upserts on name."

    def handle(self, *args, **options):
        # skills first: the other loaders stub any skill they can't find
        for command in ("load_skills", "load_charms", "load_decorations", "load_armors"):
            call_command(command, stdout=self.stdout, stderr=self.stderr)
