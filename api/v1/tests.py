from django.test import TestCase

from armors.models import Armor, ArmorSkill
from charms.models import Charm, CharmSkill
from decorations.models import Decoration, DecorationSkill
from skills.models import SetBonus, Skill

# the two plain lists first, then the three that prefetch the skills they grant
CATALOG_URLS = [
    "/api/v1/skills/",
    "/api/v1/set-bonuses/",
    "/api/v1/armors/",
    "/api/v1/decorations/",
    "/api/v1/charms/",
]


class CatalogAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.skill = Skill.objects.create(
            name="Wide-Range",
            url="https://example.com/Wide-Range",
            icon_url="https://example.com/wide-range.png",
            description="Allows the effects of certain items to also affect nearby allies.",
            max_level=5,
        )
        cls.bonus = SetBonus.objects.create(
            name="Lunastra Favor",
            url="https://example.com/Lunastra_Favor",
            icon_url="https://example.com/favor.png",
            requirement="Adds Stamina Cap Up when 2 pieces are equipped.",
            effects=["Increases Stamina Cap"],
            tiers=[{"pieces": 2, "skill": "Stamina Cap Up"}],
        )
        for name in ["Empress Crown Gamma", "Kulu Headpiece"]:
            armor = Armor.objects.create(
                name=name,
                type=Armor.Type.HEAD,
                url="https://example.com/armor",
                icon_url_male="https://example.com/male.png",
                rarity=8,
                defense=70,
                slots=[3, 1],
                fire_res=3,
                water_res=1,
                thunder_res=1,
                ice_res=-3,
                dragon_res=2,
                set_bonus=cls.bonus if name == "Empress Crown Gamma" else None,
            )
            ArmorSkill.objects.create(armor=armor, skill=cls.skill, level=2)
        cls.decoration = Decoration.objects.create(name="Friendship Jewel 1", slot=1, rarity=6)
        DecorationSkill.objects.create(decoration=cls.decoration, skill=cls.skill, level=1)
        cls.charm = Charm.objects.create(
            name="Friendship Charm III",
            url="https://example.com/charm",
            icon_url="https://example.com/charm.png",
            rarity=7,
        )
        CharmSkill.objects.create(charm=cls.charm, skill=cls.skill, level=3)

    def test_anonymous_visitor_lists_skills(self):
        response = self.client.get("/api/v1/skills/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.skill.id,
                    "name": "Wide-Range",
                    "icon_url": "https://example.com/wide-range.png",
                    "description": (
                        "Allows the effects of certain items to also affect nearby allies."
                    ),
                    "max_level": 5,
                }
            ],
        )

    def test_anonymous_visitor_lists_armors_with_the_skills_they_grant(self):
        response = self.client.get("/api/v1/armors/")

        self.assertEqual(response.status_code, 200)
        crown, kulu = response.json()
        self.assertEqual(
            crown,
            {
                "id": Armor.objects.get(name="Empress Crown Gamma").id,
                "name": "Empress Crown Gamma",
                "type": "head",
                "rarity": 8,
                "defense": 70,
                "slots": [3, 1],
                "fire_res": 3,
                "water_res": 1,
                "thunder_res": 1,
                "ice_res": -3,
                "dragon_res": 2,
                "icon_url_male": "https://example.com/male.png",
                "icon_url_female": "",
                "skills": [{"skill": self.skill.id, "level": 2}],
                "set_bonus": self.bonus.id,
            },
        )
        self.assertIsNone(kulu["set_bonus"])

    def test_anonymous_visitor_lists_set_bonuses_with_their_tiers(self):
        response = self.client.get("/api/v1/set-bonuses/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.bonus.id,
                    "name": "Lunastra Favor",
                    "icon_url": "https://example.com/favor.png",
                    "effects": ["Increases Stamina Cap"],
                    "tiers": [{"pieces": 2, "skill": "Stamina Cap Up"}],
                }
            ],
        )

    def test_anonymous_visitor_lists_decorations_with_the_skills_they_grant(self):
        response = self.client.get("/api/v1/decorations/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.decoration.id,
                    "name": "Friendship Jewel 1",
                    "slot": 1,
                    "rarity": 6,
                    "skills": [{"skill": self.skill.id, "level": 1}],
                }
            ],
        )

    def test_anonymous_visitor_lists_charms_with_the_skills_they_grant(self):
        response = self.client.get("/api/v1/charms/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.charm.id,
                    "name": "Friendship Charm III",
                    "rarity": 7,
                    "icon_url": "https://example.com/charm.png",
                    "skills": [{"skill": self.skill.id, "level": 3}],
                }
            ],
        )

    def test_stale_token_does_not_lock_a_visitor_out_of_the_catalog(self):
        # the SPA keeps an expired token in localStorage; TokenAuthentication would 401 on it
        for url in CATALOG_URLS:
            with self.subTest(url=url):
                response = self.client.get(url, HTTP_AUTHORIZATION="Token expired-or-bogus")
                self.assertEqual(response.status_code, 200)

    def test_listing_does_not_query_once_per_row(self):
        for url in CATALOG_URLS[2:]:
            with self.subTest(url=url), self.assertNumQueries(2):
                self.client.get(url)
