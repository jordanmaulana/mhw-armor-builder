from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.serializers import SetBonusSerializer
from skills.models import SetBonus


class SetBonusAPI(APIView):
    # public catalog: no authentication at all, so a stale token can't 401 the armor builder
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(SetBonusSerializer(SetBonus.objects.all(), many=True).data)
