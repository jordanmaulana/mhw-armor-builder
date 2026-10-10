from django.contrib import admin

from charms.models import Charm, CharmSkill


class CharmSkillInline(admin.TabularInline):
    model = CharmSkill
    extra = 0
    autocomplete_fields = ("skill",)


@admin.register(Charm)
class CharmAdmin(admin.ModelAdmin):
    list_display = ("name", "rarity", "zenny")
    list_filter = ("rarity",)
    search_fields = ("name",)
    inlines = (CharmSkillInline,)
