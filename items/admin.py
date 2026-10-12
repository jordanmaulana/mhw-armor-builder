from django.contrib import admin

from items.models import Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "rarity", "sell_price")
    list_filter = ("rarity",)
    search_fields = ("name",)
