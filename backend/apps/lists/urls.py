from django.urls import path

from .views import ListViewSet, item_detail, item_restore

list_view = ListViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)
detail_view = ListViewSet.as_view(
    {
        "get": "retrieve",
        "patch": "partial_update",
    }
)

urlpatterns = [
    path("lists", list_view),
    path("lists/<uuid:pk>", detail_view),
    path("lists/<uuid:pk>/archive", ListViewSet.as_view({"post": "archive"})),
    path("lists/<uuid:pk>/restore", ListViewSet.as_view({"post": "restore"})),
    path("lists/<uuid:pk>/duplicate", ListViewSet.as_view({"post": "duplicate"})),
    path("lists/<uuid:pk>/items", ListViewSet.as_view({"get": "items", "post": "add_item"})),
    path("lists/<uuid:pk>/items/reorder", ListViewSet.as_view({"post": "reorder"})),
    path("lists/<uuid:list_id>/items/<uuid:item_id>", item_detail),
    path("lists/<uuid:list_id>/items/<uuid:item_id>/restore", item_restore),
]
