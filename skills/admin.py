from django.contrib import admin

from skills.models import SetBonus, Skill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "max_level", "secret_max_level")
    search_fields = ("name",)


@admin.register(SetBonus)
class SetBonusAdmin(admin.ModelAdmin):
    search_fields = ("name",)
