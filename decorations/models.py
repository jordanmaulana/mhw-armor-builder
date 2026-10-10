from django.db import models

from core.models import BaseModel


class Decoration(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    slot = models.PositiveSmallIntegerField()  # slot size it needs, 1-4
    rarity = models.PositiveSmallIntegerField()
    note = models.TextField(blank=True)  # how to get it when it never drops
    # ponytail: JSON dict of {feystone: percent}; make a DropRate table if rates need querying
    drop_rates = models.JSONField(default=dict, blank=True)
    skills = models.ManyToManyField(
        "skills.Skill", through="DecorationSkill", related_name="decorations"
    )

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name


class DecorationSkill(BaseModel):
    decoration = models.ForeignKey(
        Decoration, on_delete=models.CASCADE, related_name="decoration_skills"
    )
    skill = models.ForeignKey(
        "skills.Skill", on_delete=models.CASCADE, related_name="decoration_skills"
    )
    level = models.PositiveSmallIntegerField()

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(fields=["decoration", "skill"], name="unique_decoration_skill")
        ]

    def __str__(self):
        return f"{self.decoration} - {self.skill} {self.level}"
