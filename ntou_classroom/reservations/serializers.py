from rest_framework import serializers
from .models import Reservation
from rooms.models import Classroom


class ReservationSerializer(serializers.ModelSerializer):
    classroom = serializers.SlugRelatedField(
        slug_field="room_code",
        queryset=Classroom.objects.all(),
    )

    class Meta:
        model = Reservation
        fields = "__all__"
        read_only_fields = ("user", "status", "created_at")
