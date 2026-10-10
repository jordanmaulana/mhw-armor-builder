from django.contrib import admin

from decorations.models import Decoration, DecorationSkill


class DecorationSkillInline(admin.TabularInline):
    model = DecorationSkill
    extra = 0
    autocomplete_fields = ("skill",)


@admin.register(Decoration)
class DecorationAdmin(admin.ModelAdmin):
    list_display = ("name", "slot", "rarity")
    list_filter = ("slot", "rarity")
    search_fields = ("name",)
    inlines = (DecorationSkillInline,)
