from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .serializers import (
    ItemCreateSerializer,
    ItemUpdateSerializer,
    ListCreateSerializer,
    ListDuplicateSerializer,
    ListUpdateSerializer,
    ReorderSerializer,
)


class ListViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(
            services.list_lists(
                request.user,
                group_id=request.query_params.get("group_id"),
                section=request.query_params.get("section"),
                status=request.query_params.get("status"),
                q=request.query_params.get("q"),
            )
        )

    def create(self, request):
        serializer = ListCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = services.create_list(
            request.user,
            data["group_id"],
            data["name"],
            data["visibility"],
            data.get("participant_ids", []),
        )
        return Response(result, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        return Response(services.get_list(request.user, pk))

    def partial_update(self, request, pk=None):
        serializer = ListUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.update_list(request.user, pk, **serializer.validated_data)
        return Response(result)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        return Response(services.archive_list(request.user, pk))

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        return Response(services.restore_list(request.user, pk))

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        serializer = ListDuplicateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.duplicate_list(request.user, pk, **serializer.validated_data)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="items")
    def items(self, request, pk=None):
        return Response(services.list_items(request.user, pk))

    @action(detail=True, methods=["post"], url_path="items")
    def add_item(self, request, pk=None):
        serializer = ItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.create_item(request.user, pk, serializer.validated_data["text"])
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="items/reorder")
    def reorder(self, request, pk=None):
        serializer = ReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = services.reorder_items(
            request.user, pk, serializer.validated_data["ordered_item_ids"]
        )
        return Response(result)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def item_detail(request, list_id, item_id):
    if request.method == "DELETE":
        return Response(services.delete_item(request.user, list_id, item_id))

    serializer = ItemUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = services.update_item(request.user, list_id, item_id, **serializer.validated_data)
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def item_restore(request, list_id, item_id):
    return Response(services.restore_item(request.user, list_id, item_id))