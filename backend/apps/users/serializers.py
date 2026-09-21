from rest_framework import serializers


class ProfileSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    phone = serializers.CharField()
    email = serializers.EmailField()
    email_verified_at = serializers.DateTimeField()
    created_at = serializers.DateTimeField()


class ChangePhoneStartSerializer(serializers.Serializer):
    new_phone = serializers.CharField()


class ChangePhoneConfirmSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    code = serializers.CharField()
