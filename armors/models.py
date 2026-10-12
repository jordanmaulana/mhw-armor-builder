from django.db import models

from core.models import BaseModel


class Armor(BaseModel):
    class Type(models.TextChoices):
        HEAD = "head"
        CHEST = "chest"
        ARMS = "arms"
        WAIST = "waist"
        LEGS = "legs"

    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=10, choices=Type.choices)
    url = models.URLField()
    icon_url_male = models.URLField(blank=True)
    icon_url_female = models.URLField(blank=True)
    rarity = models.PositiveSmallIntegerField(null=True, blank=True)  # the wiki leaves a few blank
    defense = models.PositiveSmallIntegerField()
    # ponytail: JSON list of slot levels, e.g. [3, 1]; make slot_1..slot_3 columns if slots
    # need querying
    slots = models.JSONField(default=list, blank=True)
    fire_res = models.SmallIntegerField()
    water_res = models.SmallIntegerField()
    thunder_res = models.SmallIntegerField()
    ice_res = models.SmallIntegerField()
    dragon_res = models.SmallIntegerField()
    skills = models.ManyToManyField("skills.Skill", through="ArmorSkill", related_name="armors")
    # on the piece, not on a set: pieces of different sets can feed the same bonus
    # (Rathalos Alpha + Rath Soul Beta both count toward Rathalos Mastery)
    set_bonus = models.ForeignKey(
        "skills.SetBonus", null=True, blank=True, on_delete=models.SET_NULL, related_name="armors"
    )

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name


class ArmorSkill(BaseModel):
    armor = models.ForeignKey(Armor, on_delete=models.CASCADE, related_name="armor_skills")
    skill = models.ForeignKey("skills.Skill", on_delete=models.CASCADE, related_name="armor_skills")
    level = models.PositiveSmallIntegerField()

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(fields=["armor", "skill"], name="unique_armor_skill")
        ]

    def __str__(self):
        return f"{self.armor} - {self.skill} {self.level}"


class ArmorMaterial(BaseModel):
    # one line of the recipe that forges the piece. A piece with no lines is handed out, forged
    # for nothing, or one no source has a recipe for. A full set (Ryu, Leon) is forged as one, so
    # each of its pieces carries the set's recipe: paid once, not once per piece
    # ponytail: lines read back in the game's order because BaseModel orders by id and the loader
    # makes them in file order; add a position column if anything else ever writes them
    armor = models.ForeignKey(Armor, on_delete=models.CASCADE, related_name="materials")
    item = models.ForeignKey("items.Item", on_delete=models.CASCADE, related_name="armor_materials")
    quantity = models.PositiveSmallIntegerField()

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(fields=["armor", "item"], name="unique_armor_material")
        ]

    def __str__(self):
        return f"{self.armor} - {self.item} x{self.quantity}"
