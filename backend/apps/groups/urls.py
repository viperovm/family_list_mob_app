from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GroupViewSet, InvitationViewSet

router = DefaultRouter()
router.register("groups", GroupViewSet, basename="group")
router.register("invitations", InvitationViewSet, basename="invitation")

urlpatterns = [
    path("", include(router.urls)),
]