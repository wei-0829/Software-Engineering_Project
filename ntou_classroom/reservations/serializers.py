# reservations/serializers.py
from rest_framework import serializers
from .models import Reservation

class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = "__all__"
        # user / status / created_at 交給後端處理，不讓前端改
        read_only_fields = ("user", "status", "created_at")
