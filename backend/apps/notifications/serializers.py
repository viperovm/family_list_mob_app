from rest_framework import serializers


class DeviceRegisterSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=4096)
    platform = serializers.ChoiceField(choices=["android", "ios"])