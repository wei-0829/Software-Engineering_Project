# reservations/urls.py
from django.urls import path
from .views import ReservationListCreateView

urlpatterns = [
    path("reservations/", ReservationListCreateView.as_view(), name="reservation-list-create"),
]
