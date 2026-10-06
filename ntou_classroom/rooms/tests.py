from django.test import TestCase
from rest_framework.test import APIRequestFactory
from .models import Classroom
from .views import ClassroomViewSet


class BuildingListFreshnessTests(TestCase):
    def buildings(self):
        request = APIRequestFactory().get('/api/rooms/classrooms/buildings/')
        response = ClassroomViewSet.as_view({'get': 'buildings'})(request)
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_creation_after_empty_response(self):
        self.assertEqual(self.buildings(), [])
        Classroom.objects.create(building='INS', room_code='INS201', capacity=40)
        self.assertEqual(self.buildings(), [
            {'code': 'INS', 'name': '資工系館', 'classroom_count': 1},
        ])

    def test_edit_and_deactivation_after_cached_response(self):
        room = Classroom.objects.create(building='INS', room_code='INS201', capacity=40)
        self.assertEqual(self.buildings()[0]['code'], 'INS')
        room.building = 'ECG'
        room.save()
        self.assertEqual(self.buildings()[0]['code'], 'ECG')
        room.is_active = False
        room.save()
        self.assertEqual(self.buildings(), [])

    def test_counts_and_deletion(self):
        room = Classroom.objects.create(building='INS', room_code='INS201', capacity=40)
        Classroom.objects.create(building='INS', room_code='INS202', capacity=30)
        self.assertEqual(self.buildings()[0]['classroom_count'], 2)
        room.delete()
        self.assertEqual(self.buildings()[0]['classroom_count'], 1)
