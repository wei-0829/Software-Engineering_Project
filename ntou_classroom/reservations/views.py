# reservations/views.py
from rest_framework import generics, permissions
from .models import Reservation
from .serializers import ReservationSerializer


class ReservationListCreateView(generics.ListCreateAPIView):
    """
    GET：回傳目前登入使用者的所有預約（之後前端歷史紀錄可以用）
    POST：建立一筆新的預約
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 只看自己的預約
        return (
            Reservation.objects
            .filter(user=self.request.user)
            .select_related("classroom")
            .order_by("-date", "-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            status="pending", 
    )

