from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Device
from .serializers import DeviceRegisterSerializer


class DeviceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        serializer = DeviceRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]
        platform = serializer.validated_data["platform"]

        device, created = Device.objects.get_or_create(
            user=request.user,
            token=token,
            defaults={"platform": platform},
        )
        if not created:
            device.platform = platform
            device.is_active = True
            device.save(update_fields=["platform", "is_active", "updated_at"])

        return Response(
            {
                "id": str(device.id),
                "platform": device.platform,
                "is_active": device.is_active,
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )