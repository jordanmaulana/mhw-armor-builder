from django.contrib import admin

from armors.models import Armor, ArmorSkill


class ArmorSkillInline(admin.TabularInline):
    model = ArmorSkill
    extra = 0
    autocomplete_fields = ("skill",)


@admin.register(Armor)
class ArmorAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "rarity", "defense")
    list_filter = ("type", "rarity", "set_bonus")
    search_fields = ("name",)
    inlines = (ArmorSkillInline,)
