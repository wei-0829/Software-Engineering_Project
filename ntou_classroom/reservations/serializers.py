from rest_framework import serializers
from .models import Reservation
from rooms.models import Classroom


class ReservationSerializer(serializers.ModelSerializer):
    classroom = serializers.SlugRelatedField(
        slug_field="room_code",
        queryset=Classroom.objects.all(),
    )
    # 加入使用者資訊,方便管理員檢視
    user_email = serializers.EmailField(source='user.username', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    # 狀態顯示文字
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Reservation
        fields = "__all__"
        read_only_fields = ("user", "status", "created_at")
