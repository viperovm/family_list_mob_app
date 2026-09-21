from rest_framework import serializers


class RegisterPhoneSerializer(serializers.Serializer):
    phone = serializers.CharField()


class RegisterEmailSerializer(serializers.Serializer):
    registration_token = serializers.CharField()
    email = serializers.EmailField()


class RegisterVerifySerializer(serializers.Serializer):
    registration_token = serializers.CharField()
    code = serializers.CharField()


class LoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    device_id = serializers.CharField(required=False, allow_blank=True)


class TokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()
