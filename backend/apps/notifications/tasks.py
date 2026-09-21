from celery import shared_task
from django.apps import apps
from django.contrib.auth import get_user_model

from .services import send_push_to_user


@shared_task
def send_group_invite_push(invitation_id: str) -> None:
    Invitation = apps.get_model("groups", "Invitation")
    invitation = (
        Invitation.objects.select_related("group", "inviter", "invitee_user")
        .filter(id=invitation_id)
        .first()
    )
    if invitation is None or invitation.invitee_user is None:
        return

    send_push_to_user(
        invitation.invitee_user,
        "Приглашение в группу",
        f"{invitation.inviter.phone} приглашает вас в группу «{invitation.group.name}»",
        {
            "type": "group_invite_received",
            "invitation_id": str(invitation.id),
            "group_id": str(invitation.group.id),
            "group_name": invitation.group.name,
            "deep_link": f"app://invitations/{invitation.id}",
        },
    )


@shared_task
def send_pending_registration_push(user_id: str) -> None:
    User = get_user_model()
    Invitation = apps.get_model("groups", "Invitation")

    user = User.objects.filter(id=user_id).first()
    if user is None:
        return

    pending_count = Invitation.objects.filter(
        invitee_phone=user.phone, status="pending"
    ).count()
    if pending_count == 0:
        return

    send_push_to_user(
        user,
        "У вас есть приглашения",
        f"Вас ждут {pending_count} приглашений в группы",
        {
            "type": "group_invite_pending_registration",
            "deep_link": "app://invitations",
        },
    )
