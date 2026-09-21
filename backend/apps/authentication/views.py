from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import (
    LoginSerializer,
    RegisterEmailSerializer,
    RegisterPhoneSerializer,
    RegisterVerifySerializer,
    TokenSerializer,
)


class RegisterPhoneView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterPhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(services.start_registration(serializer.validated_data["phone"]))


class RegisterEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(
            services.send_registration_email(data["registration_token"], data["email"])
        )


class RegisterVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(services.verify_registration(data["registration_token"], data["code"]))


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response(services.login(data["phone"], data.get("device_id")))


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = TokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(services.refresh_tokens(serializer.validated_data["refresh"]))


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = TokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.logout(serializer.validated_data["refresh"])
        return Response(status=status.HTTP_204_NO_CONTENT)
