from django.db import models

from core.models import BaseModel


class Monster(BaseModel):
    class Type(models.TextChoices):
        LARGE = "large"
        SMALL = "small"

    class Species(models.TextChoices):
        BIRD_WYVERN = "bird_wyvern"
        BRUTE_WYVERN = "brute_wyvern"
        ELDER_DRAGON = "elder_dragon"
        FANGED_BEAST = "fanged_beast"
        FANGED_WYVERN = "fanged_wyvern"
        FISH = "fish"
        FLYING_WYVERN = "flying_wyvern"
        HERBIVORE = "herbivore"
        LYNIAN = "lynian"
        NEOPTERON = "neopteron"
        PISCINE_WYVERN = "piscine_wyvern"
        RELICT = "relict"
        WINGDRAKE = "wingdrake"

    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=5, choices=Type.choices)
    species = models.CharField(max_length=20, choices=Species.choices)
    url = models.URLField()
    icon_url = models.URLField(blank=True)  # the wiki has none for Gajalaka
    # ponytail: JSON list of {condition, fire, water, thunder, ice, dragon, poison, sleep,
    # paralysis, blast, stun}, stars 0-3; the first is the monster as it starts the fight, the
    # rest a state it can be in (covered in mud). Empty for small monsters: nothing rates them.
    # Make columns if weaknesses need querying
    weaknesses = models.JSONField(default=list, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name


class MonsterDrop(BaseModel):
    class Rank(models.TextChoices):
        LOW = "low"
        HIGH = "high"
        MASTER = "master"

    class Method(models.TextChoices):
        CARVE = "carve"  # capturing pays from the same table
        BREAK = "break"
        MINE = "mine"
        SHINY_DROP = "shiny_drop"
        TRACK = "track"
        PLUNDERBLADE = "plunderblade"
        PALICO = "palico"
        BANDIT_MANTLE = "bandit_mantle"
        QUEST_REWARD = "quest_reward"
        INVESTIGATION_SILVER = "investigation_silver"
        INVESTIGATION_GOLD = "investigation_gold"
        INVESTIGATION_PURPLE = "investigation_purple"
        GUIDING_LANDS_LOW = "guiding_lands_low"
        GUIDING_LANDS_MID = "guiding_lands_mid"
        GUIDING_LANDS_HIGH = "guiding_lands_high"
        GUIDING_LANDS_TEMPERED = "guiding_lands_tempered"
        SIEGE_REWARD = "siege_reward"

    monster = models.ForeignKey(Monster, on_delete=models.CASCADE, related_name="drops")
    item = models.ForeignKey("items.Item", on_delete=models.CASCADE, related_name="drops")
    rank = models.CharField(max_length=6, choices=Rank.choices)
    method = models.CharField(max_length=25, choices=Method.choices)
    # what is broken, carved or mined, in the game's words: "" is the body, "tail" the severed
    # tail. Empty for every other method
    part = models.CharField(max_length=30, blank=True)
    quantity = models.PositiveSmallIntegerField()
    chance = models.PositiveSmallIntegerField()  # percent

    class Meta(BaseModel.Meta):
        constraints = [
            # the whole row: one table can hold an item twice, at two quantities or two chances
            models.UniqueConstraint(
                fields=["monster", "rank", "method", "part", "item", "quantity", "chance"],
                name="unique_monster_drop",
            )
        ]

    def __str__(self):
        return f"{self.monster} - {self.item} ({self.rank} {self.method})"
