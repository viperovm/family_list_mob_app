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


@shared_task
def send_list_change_push(list_id: str, actor_id: str, title: str, body: str, data: dict) -> None:
    """Notify everyone who can see a list (except the actor) about a change."""
    List = apps.get_model("lists", "List")
    ListParticipant = apps.get_model("lists", "ListParticipant")
    Membership = apps.get_model("groups", "Membership")
    User = get_user_model()

    lst = List.objects.select_related("group").filter(id=list_id).first()
    if lst is None:
        return

    if lst.visibility == List.Visibility.PRIVATE:
        recipient_ids = [lst.owner_id]
    elif lst.visibility == List.Visibility.CUSTOM:
        recipient_ids = list(
            ListParticipant.objects.filter(list=lst).values_list("user_id", flat=True)
        ) + [lst.owner_id]
    else:
        recipient_ids = list(
            Membership.objects.filter(group=lst.group).values_list("user_id", flat=True)
        )

    recipients = {uid for uid in recipient_ids if str(uid) != str(actor_id)}
    for user_id in recipients:
        user = User.objects.filter(id=user_id).first()
        if user is not None:
            send_push_to_user(user, title, body, data)
