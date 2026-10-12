from django.urls import path

from api.v1 import auth_api, payments_api
from api.v1.armors_api import ArmorAPI
from api.v1.charms_api import CharmAPI
from api.v1.decorations_api import DecorationAPI
from api.v1.monsters_api import MonsterAPI
from api.v1.set_bonuses_api import SetBonusAPI
from api.v1.skills_api import SkillAPI

urlpatterns = [
    path("auth/google/", auth_api.google, name="api-v1-auth-google"),
    path("auth/register/", auth_api.register, name="api-v1-auth-register"),
    path("auth/login/", auth_api.login, name="api-v1-auth-login"),
    path("auth/logout/", auth_api.logout, name="api-v1-logout"),
    path("auth/me/", auth_api.me, name="api-v1-me"),
    path("payments/mayar/webhook/", payments_api.webhook, name="api-v1-mayar-webhook"),
    path("skills/", SkillAPI.as_view(), name="api-v1-skills"),
    path("set-bonuses/", SetBonusAPI.as_view(), name="api-v1-set-bonuses"),
    path("armors/", ArmorAPI.as_view(), name="api-v1-armors"),
    path("decorations/", DecorationAPI.as_view(), name="api-v1-decorations"),
    path("charms/", CharmAPI.as_view(), name="api-v1-charms"),
    path("monsters/", MonsterAPI.as_view(), name="api-v1-monsters"),
]
