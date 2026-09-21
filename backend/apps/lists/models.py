import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class List(models.Model):
    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        GROUP = "group", "Group"
        CUSTOM = "custom", "Custom"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey("groups.Group", on_delete=models.CASCADE, related_name="lists")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="lists",
    )
    name = models.CharField(max_length=120)
    visibility = models.CharField(
        max_length=20, choices=Visibility.choices, default=Visibility.GROUP
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="archived_lists",
    )
    source_list = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="duplicates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "name"],
                condition=Q(status="active") & ~Q(visibility="private"),
                name="uniq_active_group_list_name",
            ),
        ]

    def __str__(self):
        return self.name


class ListParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    list = models.ForeignKey(List, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="list_participations",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="added_participants",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["list", "user"], name="uniq_list_participant"),
        ]

    def __str__(self):
        return f"{self.list.name} - {self.user.phone}"


class Item(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    list = models.ForeignKey(List, on_delete=models.CASCADE, related_name="items")
    text = models.CharField(max_length=300)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    position = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_items",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_items",
    )
    status_changed_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["position", "created_at"]

    def __str__(self):
        return self.text