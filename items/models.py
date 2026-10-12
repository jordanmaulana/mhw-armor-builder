from django.db import models

from core.models import BaseModel


class Item(BaseModel):
    name = models.CharField(max_length=100, unique=True)  # the game's: Rath Wingtalon+
    url = models.URLField(blank=True)  # the wiki has no page for a few
    rarity = models.PositiveSmallIntegerField()
    sell_price = models.PositiveIntegerField()  # zenny
    # no one monster has to be hunted for it: it is mined, picked from a bonepile or dug up in
    # the Guiding Lands, or (six generic bones, Monster Bone L to Monster Solidbone) paid by
    # quests whatever their target. Monsters' tables name these too (Uragaan's back gives ore),
    # which is why it can't be read off the drops. False where no source shows a way round a hunt
    gathered = models.BooleanField(default=False)

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name
