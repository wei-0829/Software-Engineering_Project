from rest_framework import serializers
from .models import Reservation
from rooms.models import Classroom


class ReservationSerializer(serializers.ModelSerializer):
    classroom = serializers.SlugRelatedField(
        slug_field="room_code",
        queryset=Classroom.objects.all(),
    )
    user_email = serializers.EmailField(source="user.username", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Reservation
        fields = "__all__"
        read_only_fields = ("user", "status", "created_at")


class ReservationListSerializer(serializers.ModelSerializer):
    """
    ✅ 列表專用：只回前端列表需要的欄位，降低 payload 與序列化成本
    """
    classroom = serializers.SlugRelatedField(slug_field="room_code", read_only=True)
    user_email = serializers.EmailField(source="user.username", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = Reservation
        fields = (
            "id",
            "classroom",
            "date",
            "time_slot",
            "status",
            "created_at",
            "reason",      # 你前端顯示用途用這個
            "user_email",  # 管理員頁面顯示申請人
            "user_name",
        )
