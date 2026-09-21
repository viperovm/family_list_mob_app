"""Group business logic: creation, membership, invitations, leaving."""
from __future__ import annotations

from django.apps import apps
from django.db import transaction
from django.utils import timezone

from common.exceptions import APIError
from common.phone import normalize_phone

from .models import Group, Invitation, Membership


def get_membership(user, group) -> Membership:
    try:
        return Membership.objects.get(group=group, user=user)
    except Membership.DoesNotExist:
        raise APIError("GROUP_NOT_MEMBER", "Вы не состоите в этой группе.", status_code=403)


def _get_group_or_404(group_id) -> Group:
    try:
        return Group.objects.get(id=group_id)
    except Group.DoesNotExist:
        raise APIError("NOT_FOUND", "Группа не найдена.", status_code=404)


def create_group(user, name: str) -> dict:
    name = (name or "").strip()
    if not name:
        raise APIError("VALIDATION_ERROR", "Название группы обязательно.", fields={"name": ["Обязательное поле."]})
    if len(name) > 80:
        raise APIError("VALIDATION_ERROR", "Название слишком длинное.", fields={"name": ["Максимум 80 символов."]})

    with transaction.atomic():
        group = Group.objects.create(name=name, owner=user)
        Membership.objects.create(group=group, user=user, role=Membership.Role.OWNER)

    return {
        "id": str(group.id),
        "name": group.name,
        "role": "owner",
        "members_count": 1,
        "pending_invitations_count": 0,
        "created_at": group.created_at,
    }


def list_groups(user) -> list:
    memberships = Membership.objects.filter(user=user).select_related("group")
    result = []
    for m in memberships:
        group = m.group
        result.append(
            {
                "id": str(group.id),
                "name": group.name,
                "role": m.role,
                "members_count": Membership.objects.filter(group=group).count(),
                "pending_invitations_count": Invitation.objects.filter(
                    group=group, status=Invitation.Status.PENDING
                ).count(),
                "created_at": group.created_at,
            }
        )
    return result


def get_group(user, group_id) -> dict:
    group = _get_group_or_404(group_id)
    membership = get_membership(user, group)
    return {
        "id": str(group.id),
        "name": group.name,
        "role": membership.role,
        "members_count": Membership.objects.filter(group=group).count(),
        "pending_invitations_count": Invitation.objects.filter(
            group=group, status=Invitation.Status.PENDING
        ).count(),
        "created_at": group.created_at,
    }


def rename_group(user, group_id, name: str) -> dict:
    group = _get_group_or_404(group_id)
    membership = get_membership(user, group)
    if membership.role != Membership.Role.OWNER:
        raise APIError("FORBIDDEN", "Переименовать группу может только владелец.", status_code=403)

    name = (name or "").strip()
    if not name or len(name) > 80:
        raise APIError("VALIDATION_ERROR", "Название должно быть от 1 до 80 символов.")
    group.name = name
    group.save(update_fields=["name", "updated_at"])
    return get_group(user, str(group.id))


def list_members(user, group_id) -> list:
    group = _get_group_or_404(group_id)
    get_membership(user, group)
    memberships = Membership.objects.filter(group=group).select_related("user").order_by("joined_at")
    return [
        {
            "id": str(m.id),
            "user": {"id": str(m.user.id), "phone": m.user.phone},
            "role": m.role,
            "joined_at": m.joined_at,
        }
        for m in memberships
    ]


def transfer_ownership(user, group_id, new_owner_id: str) -> dict:
    group = _get_group_or_404(group_id)
    membership = get_membership(user, group)
    if membership.role != Membership.Role.OWNER:
        raise APIError("FORBIDDEN", "Только владелец может передать владение группой.", status_code=403)

    try:
        target = Membership.objects.get(group=group, user_id=new_owner_id)
    except Membership.DoesNotExist:
        raise APIError("CANNOT_TRANSFER_OWNERSHIP", "Новый владелец должен состоять в группе.")

    if target.user_id == user.id:
        raise APIError("CANNOT_TRANSFER_OWNERSHIP", "Вы уже владелец группы.")

    with transaction.atomic():
        membership.role = Membership.Role.MEMBER
        membership.save(update_fields=["role", "updated_at"])
        target.role = Membership.Role.OWNER
        target.save(update_fields=["role", "updated_at"])
        group.owner = target.user
        group.save(update_fields=["owner", "updated_at"])

    return get_group(user, str(group.id))


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------
def invite(user, group_id, phone: str) -> dict:
    group = _get_group_or_404(group_id)
    get_membership(user, group)

    normalized = normalize_phone(phone)
    if not normalized:
        raise APIError("PHONE_INVALID", "Введите корректный номер телефона.")
    if normalized == user.phone:
        raise APIError("VALIDATION_ERROR", "Нельзя пригласить самого себя.")
    if Membership.objects.filter(group=group, user__phone=normalized).exists():
        raise APIError("VALIDATION_ERROR", "Пользователь уже состоит в группе.")
    if Invitation.objects.filter(
        group=group, invitee_phone=normalized, status=Invitation.Status.PENDING
    ).exists():
        raise APIError("INVITE_ALREADY_EXISTS", "Приглашение уже отправлено.")

    from django.contrib.auth import get_user_model

    User = get_user_model()
    invitee_user = User.objects.filter(phone=normalized).first()

    invitation = Invitation.objects.create(
        group=group,
        inviter=user,
        invitee_phone=normalized,
        invitee_user=invitee_user,
        status=Invitation.Status.PENDING,
    )

    push_sent = False
    if invitee_user is not None:
        from apps.notifications.tasks import send_group_invite_push

        send_group_invite_push.delay(str(invitation.id))
        push_sent = True

    return {
        "id": str(invitation.id),
        "group_id": str(group.id),
        "invitee_phone": normalized,
        "status": invitation.status,
        "invitee_registered": invitee_user is not None,
        "push_sent": push_sent,
    }


def list_incoming(user) -> list:
    invitations = (
        Invitation.objects.filter(
            status=Invitation.Status.PENDING,
            invitee_phone=user.phone,
        )
        .select_related("group", "inviter")
        .order_by("-created_at")
    )
    return [
        {
            "id": str(inv.id),
            "group": {"id": str(inv.group.id), "name": inv.group.name},
            "inviter": {"id": str(inv.inviter.id), "phone": inv.inviter.phone},
            "status": inv.status,
            "created_at": inv.created_at,
        }
        for inv in invitations
    ]


def _get_matching_invitation(user, invitation_id) -> Invitation:
    try:
        invitation = Invitation.objects.select_related("group").get(id=invitation_id)
    except Invitation.DoesNotExist:
        raise APIError("INVITE_NOT_FOUND", "Приглашение не найдено.", status_code=404)
    if invitation.invitee_phone != user.phone:
        raise APIError("FORBIDDEN", "Это приглашение адресовано другому номеру.", status_code=403)
    return invitation


def accept(user, invitation_id) -> dict:
    invitation = _get_matching_invitation(user, invitation_id)
    if invitation.status != Invitation.Status.PENDING:
        raise APIError("INVITE_NOT_FOUND", "Приглашение уже обработано.", status_code=400)

    with transaction.atomic():
        invitation.status = Invitation.Status.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.invitee_user = user
        invitation.save(update_fields=["status", "accepted_at", "invitee_user", "updated_at"])

        Membership.objects.get_or_create(
            group=invitation.group,
            user=user,
            defaults={"role": Membership.Role.MEMBER, "invited_by": invitation.inviter},
        )

    return {
        "id": str(invitation.id),
        "group": {"id": str(invitation.group.id), "name": invitation.group.name},
        "status": invitation.status,
    }


def decline(user, invitation_id) -> dict:
    invitation = _get_matching_invitation(user, invitation_id)
    if invitation.status != Invitation.Status.PENDING:
        raise APIError("INVITE_NOT_FOUND", "Приглашение уже обработано.", status_code=400)

    invitation.status = Invitation.Status.DECLINED
    invitation.declined_at = timezone.now()
    invitation.save(update_fields=["status", "declined_at", "updated_at"])
    return {"id": str(invitation.id), "status": invitation.status}


def cancel(user, invitation_id) -> dict:
    try:
        invitation = Invitation.objects.select_related("group").get(id=invitation_id)
    except Invitation.DoesNotExist:
        raise APIError("INVITE_NOT_FOUND", "Приглашение не найдено.", status_code=404)

    membership = get_membership(user, invitation.group)
    if invitation.inviter_id != user.id and membership.role != Membership.Role.OWNER:
        raise APIError(
            "FORBIDDEN", "Отменить приглашение может пригласивший или владелец группы.", status_code=403
        )

    if invitation.status != Invitation.Status.PENDING:
        raise APIError("INVITE_NOT_FOUND", "Приглашение уже обработано.", status_code=400)

    invitation.status = Invitation.Status.CANCELLED
    invitation.cancelled_at = timezone.now()
    invitation.save(update_fields=["status", "cancelled_at", "updated_at"])
    return {"id": str(invitation.id), "status": invitation.status}



# ---------------------------------------------------------------------------
# Leaving a group
# ---------------------------------------------------------------------------
@transaction.atomic
def leave_group(user, group_id) -> dict:
    group = _get_group_or_404(group_id)
    membership = get_membership(user, group)

    List = apps.get_model("lists", "List")
    ListParticipant = apps.get_model("lists", "ListParticipant")

    # 1. Delete the user's personal (private) lists in this group.
    private_lists = List.objects.filter(group=group, owner=user, visibility="private")
    deleted_count = private_lists.count()
    private_lists.delete()

    # 2. Shared lists owned by the user transfer to the group owner (or the new owner).
    shared_lists = List.objects.filter(group=group, owner=user).exclude(visibility="private")

    other_members = list(
        Membership.objects.filter(group=group).exclude(user=user).order_by("joined_at")
    )

    new_group_owner = None
    if membership.role == Membership.Role.OWNER:
        if other_members:
            new_group_owner = other_members[0].user
            group.owner = new_group_owner
            group.save(update_fields=["owner", "updated_at"])
            other_members[0].role = Membership.Role.OWNER
            other_members[0].save(update_fields=["role", "updated_at"])
    else:
        new_group_owner = group.owner

    transferred = 0
    if new_group_owner is not None and new_group_owner.id != user.id:
        for lst in shared_lists:
            lst.owner = new_group_owner
            lst.save(update_fields=["owner", "updated_at"])
            transferred += 1

    # 3. Remove explicit access grants the leaving user had in this group's lists.
    ListParticipant.objects.filter(user=user, list__group=group).delete()

    # 4. Remove the membership.
    membership.delete()

    return {
        "deleted_private_lists_count": deleted_count,
        "transferred_lists_count": transferred,
        "group_left": True,
    }
