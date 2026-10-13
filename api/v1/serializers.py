from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import serializers

from armors.models import Armor
from charms.models import Charm
from decorations.models import Decoration
from monsters.models import Monster
from skills.models import SetBonus, Skill
from weapons.models import Weapon

User = get_user_model()


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name", "icon_url", "description", "max_level", "levels"]


class SetBonusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SetBonus
        fields = ["id", "name", "icon_url", "effects", "tiers"]


class GrantedSkillSerializer(serializers.Serializer):
    # a row of ArmorSkill / DecorationSkill / CharmSkill; the FK id is already on the row, so
    # prefetching the through rows is enough and the skill table is never joined
    skill = serializers.CharField(source="skill_id")
    level = serializers.IntegerField()


class ArmorSerializer(serializers.ModelSerializer):
    skills = GrantedSkillSerializer(source="armor_skills", many=True)
    # the id only, same reason as GrantedSkillSerializer: it is on the row, so no join
    set_bonus = serializers.CharField(source="set_bonus_id", allow_null=True)
    # what the recipe comes down to for the builder, which gets no recipe: the monsters to have
    # slain, one of each list. The view works all of them out at once and hands them in
    hunts = serializers.SerializerMethodField()

    class Meta:
        model = Armor
        fields = [
            "id",
            "name",
            "type",
            "rarity",
            "defense",
            "slots",
            "fire_res",
            "water_res",
            "thunder_res",
            "ice_res",
            "dragon_res",
            "icon_url_male",
            "icon_url_female",
            "skills",
            "set_bonus",
            "hunts",
        ]

    def get_hunts(self, obj):
        return self.context["hunts"].get(obj.id, [])


class DecorationSerializer(serializers.ModelSerializer):
    skills = GrantedSkillSerializer(source="decoration_skills", many=True)

    class Meta:
        model = Decoration
        fields = ["id", "name", "slot", "rarity", "skills"]


class CharmSerializer(serializers.ModelSerializer):
    skills = GrantedSkillSerializer(source="charm_skills", many=True)

    class Meta:
        model = Charm
        fields = ["id", "name", "rarity", "icon_url", "skills"]


class MonsterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Monster
        fields = ["id", "name", "type", "species"]


class WeaponSerializer(serializers.ModelSerializer):
    # what the builder draws and no more: the url, elderseal and both sharpness bars are left
    # out, which takes the list of 1,792 from 690 KB to 400 KB
    class Meta:
        model = Weapon
        fields = [
            "id",
            "name",
            "type",
            "rarity",
            "attack",
            "affinity",
            "defense",
            "slots",
            "elements",
            "element_hidden",
            "skill",
        ]


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    onboarded = serializers.SerializerMethodField()

    def get_onboarded(self, obj):
        # Template default: every user is considered onboarded so login -> dashboard
        # works out of the box. To add a real onboarding step, add a Profile/flag
        # (e.g. obj.profile.full_name or an `onboarded` BooleanField), return its
        # state here, and add an endpoint that flips it. See CLAUDE.md.
        return True


class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField()

    def validate(self, attrs):
        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            raise serializers.ValidationError("Google OAuth not configured")
        try:
            claims = id_token.verify_oauth2_token(
                attrs["credential"],
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError as exc:
            raise serializers.ValidationError(f"Invalid Google credential: {exc}") from exc
        if not claims.get("email_verified"):
            raise serializers.ValidationError("Email not verified")
        attrs["claims"] = claims
        return attrs


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        email = value.lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email already registered")
        return email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs["email"]).first()
        if not user or not user.check_password(attrs["password"]):
            raise serializers.ValidationError("Invalid email or password")
        attrs["user"] = user
        return attrs
