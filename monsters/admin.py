from django.contrib import admin

from monsters.models import Monster, MonsterDrop


@admin.register(Monster)
class MonsterAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "species")
    list_filter = ("type", "species")
    search_fields = ("name",)


# its own page, not an inline: a large monster has about eighty drops
@admin.register(MonsterDrop)
class MonsterDropAdmin(admin.ModelAdmin):
    list_display = ("monster", "rank", "method", "part", "item", "quantity", "chance")
    list_filter = ("rank", "method")
    search_fields = ("monster__name", "item__name")
    autocomplete_fields = ("monster", "item")
    list_select_related = ("monster", "item")
