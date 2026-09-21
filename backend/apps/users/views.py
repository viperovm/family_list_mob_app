from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication import services

from .serializers import ChangePhoneConfirmSerializer, ChangePhoneStartSerializer


class MeView(APIView):
    def get(self, request):
        user = request.user
        return Response(
            {
                "id": str(user.id),
                "phone": user.phone,
                "email": user.email,
                "email_verified_at": user.email_verified_at,
                "created_at": user.created_at,
            }
        )


class ChangePhoneStartView(APIView):
    def post(self, request):
        serializer = ChangePhoneStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.start_change_phone(request.user, serializer.validated_data["new_phone"])
        return Response(result)


class ChangePhoneConfirmView(APIView):
    def post(self, request):
        serializer = ChangePhoneConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = services.confirm_change_phone(request.user, str(data["challenge_id"]), data["code"])
        return Response(result)
