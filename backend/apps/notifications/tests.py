from django.test import TestCase
from rest_framework.test import APITestCase

from apps.notifications.models import Device
from apps.users.models import User


class DeviceModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="+79990000001", email="a@example.com")

    def test_device_unique_per_user_token(self):
        Device.objects.create(user=self.user, platform="ios", token="tok")
        with self.assertRaises(Exception):
            Device.objects.create(user=self.user, platform="android", token="tok")


class DeviceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone="+79990000001", email="a@example.com")
        self.client.force_authenticate(self.user)

    def test_register_device(self):
        response = self.client.post(
            "/api/v1/devices/", {"platform": "ios", "token": "tok123"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["created"])

    def test_reregister_existing_device(self):
        self.client.post(
            "/api/v1/devices/", {"platform": "ios", "token": "tok123"}, format="json"
        )
        response = self.client.post(
            "/api/v1/devices/", {"platform": "android", "token": "tok123"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["created"])
        device = Device.objects.get(user=self.user, token="tok123")
        self.assertEqual(device.platform, "android")
        self.assertTrue(device.is_active)
