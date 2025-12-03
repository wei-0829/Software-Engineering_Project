# reservations/urls.py
from django.urls import path
from .views import ReservationListCreateView, occupied_slots

urlpatterns = [
    path("reservations/", ReservationListCreateView.as_view(), name="reservation-list-create"),
    path("reservations/occupied/", occupied_slots, name="occupied-slots"),
]
