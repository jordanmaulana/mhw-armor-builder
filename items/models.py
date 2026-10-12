from django.db import models

from core.models import BaseModel


class Item(BaseModel):
    name = models.CharField(max_length=100, unique=True)  # the game's: Rath Wingtalon+
    url = models.URLField(blank=True)  # the wiki has no page for a few
    rarity = models.PositiveSmallIntegerField()
    sell_price = models.PositiveIntegerField()  # zenny

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name
