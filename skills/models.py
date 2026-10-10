from django.db import models

from core.models import BaseModel


class Skill(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    url = models.URLField()
    icon_url = models.URLField()
    description = models.TextField()
    max_level = models.PositiveSmallIntegerField()
    secret_name = models.CharField(max_length=100, blank=True)
    secret_max_level = models.PositiveSmallIntegerField(null=True, blank=True)
    # ponytail: JSON list of {level, effect}; make a SkillLevel table if effects need querying
    levels = models.JSONField(default=list, blank=True)

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name


class SetBonus(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    url = models.URLField()
    icon_url = models.URLField()
    requirement = models.TextField()
    effects = models.JSONField(default=list, blank=True)  # list of strings

    class Meta(BaseModel.Meta):
        ordering = ["name"]
        verbose_name_plural = "set bonuses"

    def __str__(self):
        return self.name
