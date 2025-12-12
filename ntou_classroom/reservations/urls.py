# reservations/urls.py
from django.urls import path
from .views import ReservationListCreateView, occupied_slots, update_reservation_status, cancel_reservation

urlpatterns = [
    path("reservations/", ReservationListCreateView.as_view(), name="reservation-list-create"),
    path("reservations/occupied/", occupied_slots, name="occupied-slots"),
    path("reservations/<int:pk>/status/", update_reservation_status, name="update-reservation-status"),
    path("reservations/<int:pk>/cancel/", cancel_reservation, name="cancel-reservation"),
]
