from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("created_at",)
    list_display = ("phone", "email", "is_active", "is_staff", "created_at")
    search_fields = ("phone", "email")
    fieldsets = (
        (None, {"fields": ("phone", "email", "password")}),
        ("Flags", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Timestamps", {"fields": ("email_verified_at", "created_at", "updated_at")}),
    )
    readonly_fields = ("email_verified_at", "created_at", "updated_at")
    add_fieldsets = (
        (None, {"fields": ("phone", "email", "password1", "password2")}),
    )
