from django.contrib.auth import get_user_model
from rest_framework import serializers


class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, required=True)


class GroupRenameSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80, required=True)


class GroupInviteSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20, required=True)


class GroupTransferSerializer(serializers.Serializer):
    new_owner_id = serializers.UUIDField()