from django.db import models

from core.models import BaseModel


class Charm(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    url = models.URLField()
    icon_url = models.URLField(blank=True)
    rarity = models.PositiveSmallIntegerField(null=True, blank=True)
    zenny = models.PositiveIntegerField(null=True, blank=True)
    obtained = models.TextField(blank=True)  # how to get it when it can't be crafted
    # ponytail: JSON list of {name, url, quantity}; link them to items.Item if crafting needs
    # querying. The names are the wiki's, and not all of them are an item's name
    materials = models.JSONField(default=list, blank=True)
    skills = models.ManyToManyField("skills.Skill", through="CharmSkill", related_name="charms")

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self):
        return self.name


class CharmSkill(BaseModel):
    charm = models.ForeignKey(Charm, on_delete=models.CASCADE, related_name="charm_skills")
    skill = models.ForeignKey("skills.Skill", on_delete=models.CASCADE, related_name="charm_skills")
    level = models.PositiveSmallIntegerField()

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(fields=["charm", "skill"], name="unique_charm_skill")
        ]

    def __str__(self):
        return f"{self.charm} - {self.skill} {self.level}"
