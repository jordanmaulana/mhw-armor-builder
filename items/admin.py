from django.contrib import admin

from items.models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "rarity", "sell_price", "gathered")
    list_filter = ("rarity", "gathered")
    search_fields = ("name",)
