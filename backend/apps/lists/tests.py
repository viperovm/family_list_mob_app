from django.test import TestCase
from rest_framework.test import APITestCase

from apps.groups.models import Group, Membership
from apps.lists import services
from apps.lists.models import Item, List, ListParticipant
from apps.users.models import User
from common.exceptions import APIError


def make_user(phone, email=None):
    return User.objects.create_user(phone=phone, email=email or f"{phone}@example.com")


def make_group(owner, name="Семья"):
    group = Group.objects.create(name=name, owner=owner)
    Membership.objects.create(group=group, user=owner, role=Membership.Role.OWNER)
    return group


class ListServiceTests(TestCase):
    def setUp(self):
        self.owner = make_user("+79990000001", "owner@example.com")
        self.member = make_user("+79990000002", "member@example.com")
        self.third = make_user("+79990000003", "third@example.com")
        self.group = make_group(self.owner)
        Membership.objects.create(group=self.group, user=self.member)

    # -- creation -----------------------------------------------------------
    def test_create_private_list(self):
        data = services.create_list(self.owner, str(self.group.id), "Личный", "private")
        self.assertEqual(data["visibility"], "private")

    def test_create_group_list(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        self.assertEqual(data["visibility"], "group")

    def test_create_custom_list(self):
        data = services.create_list(
            self.owner, str(self.group.id), "Совместный", "custom", [str(self.member.id)]
        )
        self.assertEqual(data["visibility"], "custom")
        self.assertTrue(
            ListParticipant.objects.filter(user=self.member, list_id=data["id"]).exists()
        )

    def test_create_list_requires_membership(self):
        with self.assertRaises(APIError):
            services.create_list(self.third, str(self.group.id), "Чужой", "group")

    def test_duplicate_active_list_name_rejected(self):
        services.create_list(self.owner, str(self.group.id), "Продукты", "group")
        with self.assertRaises(APIError):
            services.create_list(self.owner, str(self.group.id), "Продукты", "group")

    # -- access -------------------------------------------------------------
    def test_private_list_not_accessible_to_others(self):
        data = services.create_list(self.owner, str(self.group.id), "Личный", "private")
        with self.assertRaises(APIError):
            services.get_list(self.member, data["id"])

    def test_group_list_accessible_to_members(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        result = services.get_list(self.member, data["id"])
        self.assertEqual(result["id"], data["id"])

    # -- rename / archive / restore -----------------------------------------
    def test_rename_only_by_owner(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        with self.assertRaises(APIError):
            services.update_list(self.member, data["id"], name="Новое")
        result = services.update_list(self.owner, data["id"], name="Новое")
        self.assertEqual(result["name"], "Новое")

    def test_archive_by_any_member(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        result = services.archive_list(self.member, data["id"])
        self.assertEqual(result["status"], "archived")

    def test_restore_by_any_member(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        services.archive_list(self.member, data["id"])
        result = services.restore_list(self.member, data["id"])
        self.assertEqual(result["status"], "active")


    # -- duplication ---------------------------------------------------------
    def test_duplicate_full_list(self):
        data = services.create_list(self.owner, str(self.group.id), "Продукты", "group")
        services.create_item(self.owner, data["id"], "Хлеб")
        result = services.duplicate_list(self.owner, data["id"], mode="all")
        new_list = List.objects.get(id=result["new_list_id"])
        self.assertEqual(new_list.items.count(), 1)
        self.assertTrue(new_list.name.startswith("Продукты"))

    def test_duplicate_uncompleted_only(self):
        data = services.create_list(self.owner, str(self.group.id), "Продукты", "group")
        item1 = services.create_item(self.owner, data["id"], "Хлеб")
        services.create_item(self.owner, data["id"], "Молоко")
        services.update_item(self.owner, data["id"], item1["id"], status="done")
        result = services.duplicate_list(self.owner, data["id"], mode="uncompleted")
        new_list = List.objects.get(id=result["new_list_id"])
        self.assertEqual(new_list.items.count(), 1)

    def test_duplicate_autoarchive_completed_source(self):
        data = services.create_list(self.owner, str(self.group.id), "Продукты", "group")
        item = services.create_item(self.owner, data["id"], "Хлеб")
        services.update_item(self.owner, data["id"], item["id"], status="done")
        result = services.duplicate_list(self.owner, data["id"], archive_source_if_completed=True)
        self.assertTrue(result["source_archived"])
        source = List.objects.get(id=data["id"])
        self.assertEqual(source.status, "archived")

    def test_duplicate_requires_mode_when_unclosed_items(self):
        data = services.create_list(self.owner, str(self.group.id), "Продукты", "group")
        services.create_item(self.owner, data["id"], "Хлеб")
        with self.assertRaises(APIError):
            services.duplicate_list(self.owner, data["id"])

    # -- items ---------------------------------------------------------------
    def test_create_item(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        item = services.create_item(self.owner, data["id"], "Хлеб")
        self.assertEqual(item["status"], "active")
        self.assertEqual(item["position"], 1)

    def test_update_item_status(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        item = services.create_item(self.owner, data["id"], "Хлеб")
        result = services.update_item(self.owner, data["id"], item["id"], status="done")
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["position"], 0)

    def test_reorder_active_items(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        a = services.create_item(self.owner, data["id"], "A")
        b = services.create_item(self.owner, data["id"], "B")
        result = services.reorder_items(self.owner, data["id"], [b["id"], a["id"]])
        ids = [i["id"] for i in result]
        self.assertEqual(ids, [b["id"], a["id"]])

    def test_reorder_rejects_closed_items(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        a = services.create_item(self.owner, data["id"], "A")
        b = services.create_item(self.owner, data["id"], "B")
        services.update_item(self.owner, data["id"], b["id"], status="done")
        with self.assertRaises(APIError):
            services.reorder_items(self.owner, data["id"], [a["id"], b["id"]])

    def test_soft_delete_and_restore_item(self):
        data = services.create_list(self.owner, str(self.group.id), "Общий", "group")
        item = services.create_item(self.owner, data["id"], "Хлеб")
        services.delete_item(self.owner, data["id"], item["id"])
        self.assertEqual(services.list_items(self.owner, data["id"]), [])
        result = services.restore_item(self.owner, data["id"], item["id"])
        self.assertEqual(result["status"], "active")


class ListApiTests(APITestCase):
    def setUp(self):
        self.owner = make_user("+79990000001", "owner@example.com")
        self.client.force_authenticate(self.owner)
        self.group = make_group(self.owner)

    def _create_list(self, name="Продукты", visibility="group"):
        response = self.client.post(
            "/api/v1/lists",
            {"group_id": str(self.group.id), "name": name, "visibility": visibility},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.data

    def test_create_list_endpoint(self):
        data = self._create_list()
        self.assertEqual(data["name"], "Продукты")

    def test_get_list_endpoint(self):
        data = self._create_list()
        response = self.client.get(f"/api/v1/lists/{data['id']}")
        self.assertEqual(response.status_code, 200)

    def test_archive_endpoint(self):
        data = self._create_list()
        response = self.client.post(f"/api/v1/lists/{data['id']}/archive", format="json")
        self.assertEqual(response.data["status"], "archived")

    def test_items_endpoints(self):
        data = self._create_list()
        response = self.client.post(
            f"/api/v1/lists/{data['id']}/items", {"text": "Хлеб"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        item_id = response.data["id"]
        response = self.client.get(f"/api/v1/lists/{data['id']}/items")
        self.assertEqual(len(response.data), 1)
        response = self.client.patch(
            f"/api/v1/lists/{data['id']}/items/{item_id}", {"status": "done"}, format="json"
        )
        self.assertEqual(response.data["status"], "done")
