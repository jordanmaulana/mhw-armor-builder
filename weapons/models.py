from django.db import models

from core.models import BaseModel


class Weapon(BaseModel):
    class Type(models.TextChoices):
        GREAT_SWORD = "great_sword"
        LONG_SWORD = "long_sword"
        SWORD_AND_SHIELD = "sword_and_shield"
        DUAL_BLADES = "dual_blades"
        HAMMER = "hammer"
        HUNTING_HORN = "hunting_horn"
        LANCE = "lance"
        GUNLANCE = "gunlance"
        SWITCH_AXE = "switch_axe"
        CHARGE_BLADE = "charge_blade"
        INSECT_GLAIVE = "insect_glaive"
        LIGHT_BOWGUN = "light_bowgun"
        HEAVY_BOWGUN = "heavy_bowgun"
        BOW = "bow"

    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=20, choices=Type.choices)
    url = models.URLField(blank=True)  # the wiki has no page for a few
    rarity = models.PositiveSmallIntegerField()
    attack = models.PositiveSmallIntegerField()  # the number the game shows, not true raw
    affinity = models.SmallIntegerField()
    defense = models.PositiveSmallIntegerField(default=0)  # the bonus some weapons carry
    # ponytail: JSON lists, like Armor.slots; make columns if any of them needs querying
    slots = models.JSONField(default=list, blank=True)  # slot levels, e.g. [4, 1]
    # [{type, damage}]; a few dual blades have two
    elements = models.JSONField(default=list, blank=True)
    element_hidden = models.BooleanField(default=False)  # needs Free Elem/Ammo Up
    elderseal = models.CharField(max_length=10, blank=True)  # low, average or high
    # red to purple in the game's units (a full bar is 400); empty for bows and bowguns
    sharpness = models.JSONField(default=list, blank=True)
    sharpness_max = models.JSONField(default=list, blank=True)  # the same bar at Handicraft 5
    # a name, not a link: it is a skill (Critical Element), a set bonus (Kulve Taroth Essence)
    # or a set-bonus skill that is in neither table (Guts)
    skill = models.CharField(max_length=100, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name
