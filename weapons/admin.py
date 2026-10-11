from django.contrib import admin

from weapons.models import Weapon


@admin.register(Weapon)
class WeaponAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "rarity", "attack")
    list_filter = ("type", "rarity")
    search_fields = ("name",)
