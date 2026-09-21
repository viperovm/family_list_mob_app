from django.urls import path

from .views import (
    LoginView,
    LogoutView,
    RefreshView,
    RegisterEmailView,
    RegisterPhoneView,
    RegisterVerifyView,
)

urlpatterns = [
    path("auth/register/phone", RegisterPhoneView.as_view(), name="register-phone"),
    path("auth/register/email", RegisterEmailView.as_view(), name="register-email"),
    path("auth/register/verify", RegisterVerifyView.as_view(), name="register-verify"),
    path("auth/login", LoginView.as_view(), name="login"),
    path("auth/refresh", RefreshView.as_view(), name="refresh"),
    path("auth/logout", LogoutView.as_view(), name="logout"),
]
