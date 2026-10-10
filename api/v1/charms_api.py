from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.serializers import CharmSerializer
from charms.models import Charm


class CharmAPI(APIView):
    # public catalog: no authentication at all, so a stale token can't 401 the armor builder
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        charms = Charm.objects.prefetch_related("charm_skills")
        return Response(CharmSerializer(charms, many=True).data)
