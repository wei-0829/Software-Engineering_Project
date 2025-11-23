# reservations/views.py
from rest_framework import generics, permissions
from .models import Reservation
from .serializers import ReservationSerializer

class ReservationListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/reservations/   → 列出自己的預約
    POST /api/reservations/   → 建立新的預約申請
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 只看到「自己」的預約紀錄
        return Reservation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # 自動把 user 設成目前登入的使用者，狀態預設 pending
        serializer.save(user=self.request.user)
