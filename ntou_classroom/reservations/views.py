# reservations/views.py
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from datetime import datetime, timedelta
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


@api_view(['GET'])
@permission_classes([AllowAny])
def occupied_slots(request):
    """
    GET /api/reservations/occupied/
    
    查詢特定教室在特定日期範圍的已預約時段
    
    查詢參數：
    - classroom: 教室代碼（必填，例如：INS201）
    - date_from: 起始日期（選填，格式：YYYY-MM-DD）
    - date_to: 結束日期（選填，格式：YYYY-MM-DD）
    
    回傳格式：
    [
        {
            "date": "2025-11-30",
            "time_slot": "10-12",
            "status": "approved",
            "user": "user@email.ntou.edu.tw"
        }
    ]
    """
    classroom_code = request.query_params.get('classroom')
    
    if not classroom_code:
        return Response(
            {"error": "缺少必填參數：classroom"}, 
            status=400
        )
    
    # 日期範圍
    date_from_str = request.query_params.get('date_from')
    date_to_str = request.query_params.get('date_to')
    
    # 預設查詢範圍：今天起兩週內
    if not date_from_str:
        date_from = datetime.now().date()
    else:
        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "date_from 格式錯誤，應為 YYYY-MM-DD"}, 
                status=400
            )
    
    if not date_to_str:
        date_to = date_from + timedelta(days=14)
    else:
        try:
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "date_to 格式錯誤，應為 YYYY-MM-DD"}, 
                status=400
            )
    
    # 查詢已批准或待審核的預約（排除已取消和已拒絕）
    reservations = Reservation.objects.filter(
        classroom__room_code=classroom_code,
        date__gte=date_from,
        date__lte=date_to,
        status__in=['pending', 'approved']
    ).select_related('classroom', 'user').order_by('date', 'time_slot')
    
    # 組合回傳資料
    result = []
    for res in reservations:
        result.append({
            'date': res.date.strftime('%Y-%m-%d'),
            'time_slot': res.time_slot,
            'status': res.status,
            'user': res.user.username if res.user else None,
        })
    
    return Response(result)

