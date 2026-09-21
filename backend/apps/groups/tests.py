from django.test import TestCase
from rest_framework.test import APITestCase

from apps.groups import services
from apps.groups.models import Group, Invitation, Membership
from apps.users.models import User
from common.exceptions import APIError


def make_user(phone, email=None):
    return User.objects.create_user(phone=phone, email=email or f"{phone}@example.com")


class GroupServiceTests(TestCase):
    def setUp(self):
        self.owner = make_user("+79990000001", "owner@example.com")
        self.member = make_user("+79990000002", "member@example.com")
        self.third = make_user("+79990000003", "third@example.com")
        self.group = Group.objects.create(name="Семья", owner=self.owner)
        Membership.objects.create(group=self.group, user=self.owner, role=Membership.Role.OWNER)

    # -- creation -----------------------------------------------------------
    def test_create_group_creates_owner_membership(self):
        data = services.create_group(self.third, "Друзья")
        self.assertEqual(data["role"], "owner")
        self.assertEqual(data["members_count"], 1)
        self.assertTrue(Membership.objects.filter(user=self.third, role="owner").exists())

    def test_create_group_requires_name(self):
        with self.assertRaises(APIError):
            services.create_group(self.third, "   ")

    # -- invitations ---------------------------------------------------------
    def test_invite_registered_user(self):
        result = services.invite(self.owner, str(self.group.id), "+79990000002")
        self.assertTrue(result["invitee_registered"])
        invitation = Invitation.objects.get(id=result["id"])
        self.assertEqual(invitation.invitee_user, self.member)
        self.assertEqual(invitation.status, Invitation.Status.PENDING)

    def test_invite_unregistered_user(self):
        result = services.invite(self.owner, str(self.group.id), "+79990000099")
        self.assertFalse(result["invitee_registered"])
        invitation = Invitation.objects.get(id=result["id"])
        self.assertIsNone(invitation.invitee_user)

    def test_duplicate_active_invitation_rejected(self):
        services.invite(self.owner, str(self.group.id), "+79990000002")
        with self.assertRaises(APIError):
            services.invite(self.owner, str(self.group.id), "+79990000002")

    def test_accept_invitation(self):
        inv = services.invite(self.owner, str(self.group.id), "+79990000002")
        result = services.accept(self.member, inv["id"])
        self.assertEqual(result["status"], Invitation.Status.ACCEPTED)
        self.assertTrue(Membership.objects.filter(group=self.group, user=self.member).exists())

    def test_decline_invitation(self):
        inv = services.invite(self.owner, str(self.group.id), "+79990000002")
        result = services.decline(self.member, inv["id"])
        self.assertEqual(result["status"], Invitation.Status.DECLINED)

    def test_accept_non_pending_invitation_fails(self):
        inv = services.invite(self.owner, str(self.group.id), "+79990000002")
        services.decline(self.member, inv["id"])
        with self.assertRaises(APIError):
            services.accept(self.member, inv["id"])

    # -- membership / ownership ---------------------------------------------
    def test_rename_only_by_owner(self):
        Membership.objects.create(group=self.group, user=self.member)
        with self.assertRaises(APIError):
            services.rename_group(self.member, str(self.group.id), "Новое")
        data = services.rename_group(self.owner, str(self.group.id), "Новое")
        self.assertEqual(data["name"], "Новое")

    def test_transfer_ownership(self):
        Membership.objects.create(group=self.group, user=self.member)
        data = services.transfer_ownership(self.owner, str(self.group.id), str(self.member.id))
        self.assertEqual(data["role"], "member")
        self.group.refresh_from_db()
        self.assertEqual(self.group.owner, self.member)

    # -- leaving -------------------------------------------------------------
    def test_member_leave_group(self):
        Membership.objects.create(group=self.group, user=self.member)
        result = services.leave_group(self.member, str(self.group.id))
        self.assertTrue(result["group_left"])
        self.assertFalse(Membership.objects.filter(group=self.group, user=self.member).exists())

    def test_owner_leave_transfers_ownership(self):
        Membership.objects.create(group=self.group, user=self.member)
        result = services.leave_group(self.owner, str(self.group.id))
        self.assertTrue(result["group_left"])
        self.group.refresh_from_db()
        self.assertEqual(self.group.owner, self.member)
        self.assertEqual(
            Membership.objects.get(group=self.group, user=self.member).role,
            Membership.Role.OWNER,
        )

    def test_leave_deletes_private_lists(self):
        from apps.lists.models import List

        Membership.objects.create(group=self.group, user=self.member)
        private = List.objects.create(
            group=self.group, owner=self.member, name="Личный", visibility="private"
        )
        shared = List.objects.create(
            group=self.group, owner=self.member, name="Общий", visibility="group"
        )
        result = services.leave_group(self.member, str(self.group.id))
        self.assertEqual(result["deleted_private_lists_count"], 1)
        self.assertFalse(List.objects.filter(id=private.id).exists())
        self.assertTrue(List.objects.filter(id=shared.id).exists())


class GroupApiTests(APITestCase):
    def setUp(self):
        self.owner = make_user("+79990000001", "owner@example.com")
        self.client.force_authenticate(self.owner)

    def test_create_group_endpoint(self):
        response = self.client.post("/api/v1/groups/", {"name": "Семья"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], "Семья")

    def test_list_groups_endpoint(self):
        self.client.post("/api/v1/groups/", {"name": "Семья"}, format="json")
        response = self.client.get("/api/v1/groups/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_invite_endpoint(self):
        self.client.post("/api/v1/groups/", {"name": "Семья"}, format="json")
        group_id = self.client.get("/api/v1/groups/").data[0]["id"]
        response = self.client.post(
            f"/api/v1/groups/{group_id}/invitations/", {"phone": "+79990000002"}, format="json"
        )
        self.assertEqual(response.status_code, 201)

