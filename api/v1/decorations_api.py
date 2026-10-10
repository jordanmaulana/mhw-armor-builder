from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.serializers import DecorationSerializer
from decorations.models import Decoration


class DecorationAPI(APIView):
    # public catalog: no authentication at all, so a stale token can't 401 the armor builder
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        decorations = Decoration.objects.prefetch_related("decoration_skills")
        return Response(DecorationSerializer(decorations, many=True).data)
