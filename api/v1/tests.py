from django.test import TestCase

from armors.models import Armor, ArmorMaterial, ArmorSkill
from charms.models import Charm, CharmSkill
from decorations.models import Decoration, DecorationSkill
from items.models import Item
from monsters.models import Monster, MonsterDrop
from skills.models import SetBonus, Skill
from weapons.models import Weapon

# every catalog list and the queries it takes, however many rows it has: one for a plain list,
# one more for the skills its rows grant, and two more for the hunts the armors' recipes ask for
CATALOG_QUERIES = {
    "/api/v1/skills/": 1,
    "/api/v1/set-bonuses/": 1,
    "/api/v1/monsters/": 1,
    "/api/v1/weapons/": 1,
    "/api/v1/armors/": 4,
    "/api/v1/decorations/": 2,
    "/api/v1/charms/": 2,
}


class CatalogAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.skill = Skill.objects.create(
            name="Wide-Range",
            url="https://example.com/Wide-Range",
            icon_url="https://example.com/wide-range.png",
            description="Allows the effects of certain items to also affect nearby allies.",
            max_level=5,
            levels=[
                {"level": 1, "effect": "Items affect nearby allies with 33% of their efficacy."}
            ],
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
        cls.monster = Monster.objects.create(
            name="Lunastra",
            type=Monster.Type.LARGE,
            species=Monster.Species.ELDER_DRAGON,
            url="https://example.com/Lunastra",
            icon_url="https://example.com/lunastra.png",
        )
        mane = Item.objects.create(name="Lunastra Mane", rarity=8, sell_price=4000)
        MonsterDrop.objects.create(
            monster=cls.monster,
            item=mane,
            rank=MonsterDrop.Rank.HIGH,
            method=MonsterDrop.Method.CARVE,
            quantity=1,
            chance=30,
        )
        crown = Armor.objects.get(name="Empress Crown Gamma")
        ArmorMaterial.objects.create(armor=crown, item=mane, quantity=2)
        cls.decoration = Decoration.objects.create(name="Friendship Jewel 1", slot=1, rarity=6)
        DecorationSkill.objects.create(decoration=cls.decoration, skill=cls.skill, level=1)
        cls.charm = Charm.objects.create(
            name="Friendship Charm III",
            url="https://example.com/charm",
            icon_url="https://example.com/charm.png",
            rarity=7,
        )
        CharmSkill.objects.create(charm=cls.charm, skill=cls.skill, level=3)
        cls.weapon = Weapon.objects.create(
            name='Kjárr Slicer "Blast"',
            type=Weapon.Type.SWORD_AND_SHIELD,
            url="https://example.com/Kjarr_Slicer_Blast",
            rarity=12,
            attack=378,
            affinity=10,
            defense=20,
            slots=[1],
            elements=[{"type": "blast", "damage": 450}],
            elderseal="",
            sharpness=[110, 30, 60, 80, 40, 80, 0],
            sharpness_max=[110, 30, 60, 80, 40, 80, 0],
            skill="Critical Status",
        )

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
                    "secret_name": "",
                    "secret_max_level": None,
                    "levels": [
                        {
                            "level": 1,
                            "effect": "Items affect nearby allies with 33% of their efficacy.",
                        }
                    ],
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
                "hunts": [[self.monster.id]],
            },
        )
        self.assertIsNone(kulu["set_bonus"])
        # no recipe line names a monster's drop
        self.assertEqual(kulu["hunts"], [])

    def test_anonymous_visitor_lists_monsters(self):
        response = self.client.get("/api/v1/monsters/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.monster.id,
                    "name": "Lunastra",
                    "type": "large",
                    "species": "elder_dragon",
                }
            ],
        )

    def test_anonymous_visitor_lists_weapons(self):
        response = self.client.get("/api/v1/weapons/")

        self.assertEqual(response.status_code, 200)
        # what the builder draws and no more: no url, elderseal or sharpness
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.weapon.id,
                    "name": 'Kjárr Slicer "Blast"',
                    "type": "sword_and_shield",
                    "rarity": 12,
                    "attack": 378,
                    "affinity": 10,
                    "defense": 20,
                    "slots": [1],
                    "elements": [{"type": "blast", "damage": 450}],
                    "element_hidden": False,
                    "skill": "Critical Status",
                }
            ],
        )

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
        for url in CATALOG_QUERIES:
            with self.subTest(url=url):
                response = self.client.get(url, HTTP_AUTHORIZATION="Token expired-or-bogus")
                self.assertEqual(response.status_code, 200)

    def test_listing_does_not_query_once_per_row(self):
        for url, queries in CATALOG_QUERIES.items():
            with self.subTest(url=url), self.assertNumQueries(queries):
                self.client.get(url)
