from django.contrib import admin

from .models import EmailCode, RegistrationSession


@admin.register(RegistrationSession)
class RegistrationSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "phone", "email", "created_at", "expires_at", "completed_at")
    search_fields = ("phone", "email")


@admin.register(EmailCode)
class EmailCodeAdmin(admin.ModelAdmin):
    list_display = ("id", "purpose", "email", "attempts", "expires_at", "consumed_at")
    list_filter = ("purpose",)
    search_fields = ("email", "phone", "new_phone")
