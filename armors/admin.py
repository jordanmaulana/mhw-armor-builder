from django.contrib import admin

from armors.models import Armor, ArmorMaterial, ArmorSkill


class ArmorSkillInline(admin.TabularInline):
    model = ArmorSkill
    extra = 0
    autocomplete_fields = ("skill",)


class ArmorMaterialInline(admin.TabularInline):
    model = ArmorMaterial
    extra = 0
    autocomplete_fields = ("item",)


@admin.register(Armor)
class ArmorAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "rarity", "defense")
    list_filter = ("type", "rarity", "set_bonus")
    search_fields = ("name",)
    inlines = (ArmorSkillInline, ArmorMaterialInline)
