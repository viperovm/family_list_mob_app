"""Shopping list business logic."""
from __future__ import annotations

from django.db import models, transaction
from django.db.models import Count, Q
from django.utils import timezone

from common.exceptions import APIError
from apps.groups.models import Group, Membership

from .models import Item, List, ListParticipant

VALID_VISIBILITIES = [List.Visibility.PRIVATE, List.Visibility.GROUP, List.Visibility.CUSTOM]


def _get_group_or_404(group_id) -> Group:
    try:
        return Group.objects.get(id=group_id)
    except Group.DoesNotExist:
        raise APIError("NOT_FOUND", "Группа не найдена.", status_code=404)


def _get_list_or_404(list_id) -> List:
    try:
        return List.objects.select_related("group", "owner").get(id=list_id)
    except List.DoesNotExist:
        raise APIError("NOT_FOUND", "Список не найден.", status_code=404)


def _ensure_group_member(user, group):
    if not Membership.objects.filter(group=group, user=user).exists():
        raise APIError("GROUP_NOT_MEMBER", "Вы не состоите в этой группе.", status_code=403)


def _can_access(user, lst: List) -> bool:
    if lst.owner_id == user.id:
        return True
    if lst.visibility == List.Visibility.PRIVATE:
        return False
    if lst.visibility == List.Visibility.GROUP:
        return Membership.objects.filter(group=lst.group, user=user).exists()
    return (
        ListParticipant.objects.filter(list=lst, user=user).exists()
        and Membership.objects.filter(group=lst.group, user=user).exists()
    )


def _ensure_access(user, lst: List):
    if not _can_access(user, lst):
        raise APIError("LIST_NOT_MEMBER", "У вас нет доступа к этому списку.", status_code=403)


def _progress(lst: List) -> dict:
    counts = Item.objects.filter(list=lst, deleted_at__isnull=True).aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(status=Item.Status.ACTIVE)),
        done=Count("id", filter=Q(status=Item.Status.DONE)),
        failed=Count("id", filter=Q(status=Item.Status.FAILED)),
    )
    return {
        "total": counts["total"] or 0,
        "active": counts["active"] or 0,
        "done": counts["done"] or 0,
        "failed": counts["failed"] or 0,
    }


def _permissions(user, lst: List) -> dict:
    is_owner = lst.owner_id == user.id
    has_access = _can_access(user, lst)
    return {
        "rename": is_owner,
        "manage_access": is_owner,
        "archive": has_access and lst.status == List.Status.ACTIVE,
        "restore": has_access and lst.status == List.Status.ARCHIVED,
        "duplicate": has_access,
    }


def _serialize_list(user, lst: List) -> dict:
    return {
        "id": str(lst.id),
        "group": {"id": str(lst.group.id), "name": lst.group.name},
        "owner": {"id": str(lst.owner.id), "phone": lst.owner.phone},
        "name": lst.name,
        "visibility": lst.visibility,
        "status": lst.status,
        "progress": _progress(lst),
        "permissions": _permissions(user, lst),
        "created_at": lst.created_at,
        "updated_at": lst.updated_at,
    }


def _serialize_item(item: Item) -> dict:
    return {
        "id": str(item.id),
        "text": item.text,
        "status": item.status,
        "position": item.position,
        "status_changed_at": item.status_changed_at,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }

def _items_queryset(lst: List):
    active = list(
        Item.objects.filter(list=lst, deleted_at__isnull=True, status=Item.Status.ACTIVE)
        .order_by("position", "created_at")
    )
    closed = list(
        Item.objects.filter(list=lst, deleted_at__isnull=True)
        .exclude(status=Item.Status.ACTIVE)
        .order_by("-status_changed_at", "-created_at")
    )
    return active + closed


def list_lists(user, group_id=None, section=None, status=None, q=None) -> list:
    member_group_ids = list(Membership.objects.filter(user=user).values_list("group_id", flat=True))
    participant_list_ids = list(
        ListParticipant.objects.filter(user=user).values_list("list_id", flat=True)
    )

    qs = List.objects.filter(
        Q(owner=user)
        | Q(visibility=List.Visibility.GROUP, group_id__in=member_group_ids)
        | Q(
            visibility=List.Visibility.CUSTOM,
            id__in=participant_list_ids,
            group_id__in=member_group_ids,
        )
    ).distinct()

    if group_id:
        qs = qs.filter(group_id=group_id)
    if status:
        qs = qs.filter(status=status)
    if q:
        qs = qs.filter(name__icontains=q)
    if section == "private":
        qs = qs.filter(visibility=List.Visibility.PRIVATE)
    elif section == "shared":
        qs = qs.exclude(visibility=List.Visibility.PRIVATE)

    return [_serialize_list(user, lst) for lst in qs]


def create_list(user, group_id, name, visibility, participant_ids=None) -> dict:
    group = _get_group_or_404(group_id)
    _ensure_group_member(user, group)

    name = (name or "").strip()
    if not name or len(name) > 120:
        raise APIError("VALIDATION_ERROR", "Название списка должно быть от 1 до 120 символов.")
    if visibility not in VALID_VISIBILITIES:
        raise APIError("VALIDATION_ERROR", "Некорректный тип видимости списка.")

    if List.objects.filter(group=group, name=name, status=List.Status.ACTIVE).exclude(
        visibility=List.Visibility.PRIVATE
    ).exists():
        raise APIError("VALIDATION_ERROR", "Список с таким названием уже существует в группе.")

    participant_ids = participant_ids or []

    with transaction.atomic():
        lst = List.objects.create(group=group, owner=user, name=name, visibility=visibility)
        if visibility == List.Visibility.CUSTOM:
            for pid in participant_ids:
                if str(pid) == str(user.id):
                    continue
                if not Membership.objects.filter(group=group, user_id=pid).exists():
                    raise APIError("VALIDATION_ERROR", "Участник должен состоять в группе.")
                ListParticipant.objects.create(list=lst, user_id=pid, added_by=user)

    return _serialize_list(user, lst)


def get_list(user, list_id) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    data = _serialize_list(user, lst)
    data["participants"] = [
        {
            "id": str(p.id),
            "user": {"id": str(p.user.id), "phone": p.user.phone},
            "created_at": p.created_at,
        }
        for p in lst.participants.select_related("user").all()
    ]
    data["items"] = [_serialize_item(i) for i in _items_queryset(lst)]
    return data


def update_list(user, list_id, name=None, visibility=None, participant_ids=None) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    if lst.owner_id != user.id:
        raise APIError("FORBIDDEN", "Изменять список может только владелец.", status_code=403)

    if visibility is not None and visibility not in VALID_VISIBILITIES:
        raise APIError("VALIDATION_ERROR", "Некорректный тип видимости списка.")

    new_name = lst.name
    if name is not None:
        new_name = (name or "").strip()
        if not new_name or len(new_name) > 120:
            raise APIError("VALIDATION_ERROR", "Название списка должно быть от 1 до 120 символов.")
        conflict = (
            List.objects.filter(group=lst.group, name=new_name, status=List.Status.ACTIVE)
            .exclude(id=lst.id)
            .exclude(visibility=List.Visibility.PRIVATE)
            .exists()
        )
        if conflict:
            raise APIError("VALIDATION_ERROR", "Список с таким названием уже существует в группе.")

    new_visibility = visibility if visibility is not None else lst.visibility

    with transaction.atomic():
        if name is not None:
            lst.name = new_name
        if visibility is not None:
            lst.visibility = new_visibility
        lst.save(update_fields=["name", "visibility", "updated_at"])

        if new_visibility == List.Visibility.CUSTOM and participant_ids is not None:
            current = set(lst.participants.values_list("user_id", flat=True))
            wanted = set()
            for pid in participant_ids:
                if str(pid) == str(user.id):
                    continue
                if not Membership.objects.filter(group=lst.group, user_id=pid).exists():
                    raise APIError("VALIDATION_ERROR", "Участник должен состоять в группе.")
                wanted.add(pid)
            to_remove = current - wanted
            to_add = wanted - current
            lst.participants.filter(user_id__in=to_remove).delete()
            for pid in to_add:
                ListParticipant.objects.create(list=lst, user_id=pid, added_by=user)
        elif new_visibility != List.Visibility.CUSTOM:
            lst.participants.all().delete()

    return _serialize_list(user, lst)


def archive_list(user, list_id) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    if lst.status == List.Status.ARCHIVED:
        return _serialize_list(user, lst)
    lst.status = List.Status.ARCHIVED
    lst.archived_at = timezone.now()
    lst.archived_by = user
    lst.save(update_fields=["status", "archived_at", "archived_by", "updated_at"])
    return _serialize_list(user, lst)


def restore_list(user, list_id) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    if lst.status == List.Status.ACTIVE:
        return _serialize_list(user, lst)

    conflict = (
        List.objects.filter(group=lst.group, name=lst.name, status=List.Status.ACTIVE)
        .exclude(id=lst.id)
        .exclude(visibility=List.Visibility.PRIVATE)
        .exists()
    )
    if conflict:
        raise APIError("VALIDATION_ERROR", "Активный список с таким названием уже существует в группе.")

    lst.status = List.Status.ACTIVE
    lst.archived_at = None
    lst.archived_by = None
    lst.save(update_fields=["status", "archived_at", "archived_by", "updated_at"])
    return _serialize_list(user, lst)


def _make_unique_name(group: Group, base_name: str) -> str:
    base = base_name or "Список"
    candidate = f"{base} (копия)"
    taken = set(
        List.objects.filter(group=group, status=List.Status.ACTIVE)
        .exclude(visibility=List.Visibility.PRIVATE)
        .values_list("name", flat=True)
    )
    if candidate not in taken:
        return candidate
    i = 2
    while f"{candidate} {i}" in taken:
        i += 1
    return f"{candidate} {i}"

def duplicate_list(user, list_id, mode=None, archive_source_if_completed=False) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)

    items = Item.objects.filter(list=lst, deleted_at__isnull=True)
    has_unclosed = items.filter(status__in=[Item.Status.ACTIVE, Item.Status.FAILED]).exists()

    if has_unclosed and mode not in ("all", "uncompleted"):
        raise APIError(
            "VALIDATION_ERROR",
            "Укажите mode: all или uncompleted.",
            fields={"mode": ["Обязательное поле, если есть незавершённые позиции."]},
        )

    if mode == "uncompleted":
        source_items = items.filter(status__in=[Item.Status.ACTIVE, Item.Status.FAILED])
    else:
        source_items = items

    source_items = list(source_items.order_by("position", "created_at"))
    if not source_items:
        raise APIError("VALIDATION_ERROR", "Нечего дублировать: в списке нет позиций.")

    with transaction.atomic():
        new_list = List.objects.create(
            group=lst.group,
            owner=user,
            name=_make_unique_name(lst.group, lst.name),
            visibility=lst.visibility,
            source_list=lst,
        )

        if lst.visibility == List.Visibility.CUSTOM:
            member_ids = set(
                Membership.objects.filter(group=lst.group).values_list("user_id", flat=True)
            )
            for p in lst.participants.all():
                if p.user_id in member_ids:
                    ListParticipant.objects.create(list=new_list, user=p.user, added_by=user)

        position = 0
        for item in source_items:
            position += 1
            Item.objects.create(
                list=new_list,
                text=item.text,
                status=Item.Status.ACTIVE,
                position=position,
                created_by=user,
            )

        source_archived = False
        all_closed = not items.filter(
            status__in=[Item.Status.ACTIVE, Item.Status.FAILED]
        ).exists()
        if all_closed and archive_source_if_completed and lst.status == List.Status.ACTIVE:
            lst.status = List.Status.ARCHIVED
            lst.archived_at = timezone.now()
            lst.archived_by = user
            lst.save(update_fields=["status", "archived_at", "archived_by", "updated_at"])
            source_archived = True

    return {
        "new_list_id": str(new_list.id),
        "source_archived": source_archived,
        "copied_items_count": len(source_items),
    }

def list_items(user, list_id) -> list:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    return [_serialize_item(i) for i in _items_queryset(lst)]


def create_item(user, list_id, text) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    text = (text or "").strip()
    if not text or len(text) > 300:
        raise APIError("VALIDATION_ERROR", "Текст позиции должен быть от 1 до 300 символов.")

    max_position = (
        Item.objects.filter(list=lst, deleted_at__isnull=True, status=Item.Status.ACTIVE).aggregate(
            m=models.Max("position")
        )["m"]
        or 0
    )
    item = Item.objects.create(
        list=lst, text=text, position=max_position + 1, created_by=user, updated_by=user
    )
    return _serialize_item(item)


def _get_item_or_404(list_id, item_id) -> Item:
    try:
        return Item.objects.get(id=item_id, list_id=list_id, deleted_at__isnull=True)
    except Item.DoesNotExist:
        raise APIError("NOT_FOUND", "Позиция не найдена.", status_code=404)


def update_item(user, list_id, item_id, text=None, status=None) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    item = _get_item_or_404(list_id, item_id)

    if text is not None:
        text = (text or "").strip()
        if not text or len(text) > 300:
            raise APIError("VALIDATION_ERROR", "Текст позиции должен быть от 1 до 300 символов.")
        item.text = text

    if status is not None:
        if status not in [Item.Status.ACTIVE, Item.Status.DONE, Item.Status.FAILED]:
            raise APIError("VALIDATION_ERROR", "Некорректный статус позиции.")
        if status != item.status:
            item.status = status
            item.status_changed_at = timezone.now()
            if status == Item.Status.ACTIVE:
                max_position = (
                    Item.objects.filter(
                        list=lst, deleted_at__isnull=True, status=Item.Status.ACTIVE
                    )
                    .exclude(id=item.id)
                    .aggregate(m=models.Max("position"))["m"]
                    or 0
                )
                item.position = max_position + 1
            else:
                item.position = 0

    item.updated_by = user
    item.save(update_fields=["text", "status", "position", "status_changed_at", "updated_by", "updated_at"])
    return _serialize_item(item)


@transaction.atomic
def reorder_items(user, list_id, ordered_item_ids) -> list:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)

    active_items = list(
        Item.objects.filter(list=lst, deleted_at__isnull=True, status=Item.Status.ACTIVE)
    )
    active_ids = {str(i.id) for i in active_items}
    if set(ordered_item_ids) != active_ids:
        raise APIError("VALIDATION_ERROR", "Список позиций должен совпадать с активными позициями.")

    by_id = {str(i.id): i for i in active_items}
    for position, item_id in enumerate(ordered_item_ids, start=1):
        by_id[item_id].position = position
    Item.objects.bulk_update(active_items, ["position"])
    return [_serialize_item(i) for i in _items_queryset(lst)]


def delete_item(user, list_id, item_id) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    item = _get_item_or_404(list_id, item_id)
    item.deleted_at = timezone.now()
    item.save(update_fields=["deleted_at", "updated_at"])
    return {"id": str(item.id), "deleted": True}


def restore_item(user, list_id, item_id) -> dict:
    lst = _get_list_or_404(list_id)
    _ensure_access(user, lst)
    try:
        item = Item.objects.get(id=item_id, list_id=list_id)
    except Item.DoesNotExist:
        raise APIError("NOT_FOUND", "Позиция не найдена.", status_code=404)

    if item.deleted_at is None:
        return _serialize_item(item)

    item.deleted_at = None
    if item.status == Item.Status.ACTIVE:
        max_position = (
            Item.objects.filter(list=lst, deleted_at__isnull=True, status=Item.Status.ACTIVE)
            .exclude(id=item.id)
            .aggregate(m=models.Max("position"))["m"]
            or 0
        )
        item.position = max_position + 1
    item.save(update_fields=["deleted_at", "position", "updated_at"])
    return _serialize_item(item)