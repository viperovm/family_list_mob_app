from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .serializers import (
    GroupCreateSerializer,
    GroupInviteSerializer,
    GroupRenameSerializer,
    GroupTransferSerializer,
)


class GroupViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        serializer = GroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.create_group(request.user, serializer.validated_data["name"])
        return Response(result, status=status.HTTP_201_CREATED)

    def list(self, request):
        return Response(services.list_groups(request.user))

    def retrieve(self, request, pk=None):
        return Response(services.get_group(request.user, pk))

    def partial_update(self, request, pk=None):
        serializer = GroupRenameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.rename_group(request.user, pk, serializer.validated_data["name"])
        return Response(result)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        return Response(services.leave_group(request.user, pk))

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        return Response(services.list_members(request.user, pk))

    @action(detail=True, methods=["post"], url_path="transfer-owner")
    def transfer_owner(self, request, pk=None):
        serializer = GroupTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.transfer_ownership(
            request.user, pk, serializer.validated_data["new_owner_id"]
        )
        return Response(result)

    @action(detail=True, methods=["post"], url_path="invitations")
    def invite(self, request, pk=None):
        serializer = GroupInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.invite(request.user, pk, serializer.validated_data["phone"])
        return Response(result, status=status.HTTP_201_CREATED)


class InvitationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(services.list_incoming(request.user))

    @action(detail=False, methods=["get"], url_path="incoming")
    def incoming(self, request):
        return Response(services.list_incoming(request.user))

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        return Response(services.accept(request.user, pk))

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        return Response(services.decline(request.user, pk))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return Response(services.cancel(request.user, pk))