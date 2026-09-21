from django.contrib import admin

from .models import Item, List, ListParticipant


@admin.register(List)
class ListAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "group", "owner", "visibility", "status", "created_at")
    list_filter = ("visibility", "status")


@admin.register(ListParticipant)
class ListParticipantAdmin(admin.ModelAdmin):
    list_display = ("id", "list", "user", "added_by", "created_at")


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("id", "list", "text", "status", "position", "created_at")
    list_filter = ("status",)
    search_fields = ("text",)