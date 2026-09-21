from django.contrib import admin

from .models import Group, Invitation, Membership


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_at")
    search_fields = ("name",)


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("id", "group", "user", "role", "joined_at")
    list_filter = ("role",)


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ("id", "group", "inviter", "invitee_phone", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("invitee_phone",)
