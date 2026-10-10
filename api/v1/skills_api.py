from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.serializers import SkillSerializer
from skills.models import Skill


class SkillAPI(APIView):
    # public catalog: no authentication at all, so a stale token can't 401 the armor builder
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(SkillSerializer(Skill.objects.all(), many=True).data)
