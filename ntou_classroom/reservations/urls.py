# reservations/urls.py
from django.urls import path
from .views import ReservationListCreateView

urlpatterns = [
    path("", ReservationListCreateView.as_view(), name="reservation-list-create"),
]
