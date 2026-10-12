from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.serializers import ArmorSerializer
from armors.hunts import hunts_by_armor
from armors.models import Armor


class ArmorAPI(APIView):
    # public catalog: no authentication at all, so a stale token can't 401 the armor builder
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        armors = Armor.objects.prefetch_related("armor_skills")
        context = {"hunts": hunts_by_armor()}
        return Response(ArmorSerializer(armors, many=True, context=context).data)
