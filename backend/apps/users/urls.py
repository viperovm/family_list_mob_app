from django.urls import path

from .views import ChangePhoneConfirmView, ChangePhoneStartView, MeView

urlpatterns = [
    path("me", MeView.as_view(), name="me"),
    path("me/change-phone/start", ChangePhoneStartView.as_view(), name="change-phone-start"),
    path("me/change-phone/confirm", ChangePhoneConfirmView.as_view(), name="change-phone-confirm"),
]
