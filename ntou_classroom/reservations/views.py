# reservations/views.py
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from datetime import datetime, timedelta
from .models import Reservation
from .serializers import ReservationSerializer
from blacklist.models import Blacklist

class ReservationListCreateView(generics.ListCreateAPIView):
    """
    GET：回傳預約列表
    - 查詢參數 view_all=true：管理員看到所有使用者的預約（用於審核頁面）
    - 查詢參數 view_all=false 或不傳：所有人都只看到自己的預約（用於歷史紀錄）
    POST：建立一筆新的預約
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        view_all = self.request.query_params.get('view_all', 'false').lower() == 'true'
        
        # 只有管理員可以使用 view_all 參數查看所有預約
        if user.is_staff and view_all:
            return (
                Reservation.objects
                .select_related("classroom", "user")
                .order_by("-date", "-created_at")
            )
        
        # 預設：所有人（包括管理員）都只看自己的預約
        return (
            Reservation.objects
            .filter(user=user)
            .select_related("classroom")
            .order_by("-date", "-created_at")
        )

    def perform_create(self, serializer):
        if Blacklist.objects.filter(user=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("你已被列入黑名單，無法預約。")
        serializer.save(user=self.request.user)
        from rest_framework.exceptions import ValidationError
        from rooms.models import Classroom
        from datetime import date as date_class
        
        # 檢查是否有衝突
        classroom_code = self.request.data.get('classroom')
        date_str = self.request.data.get('date')
        time_slot = self.request.data.get('time_slot')
        
        # 驗證必填欄位
        if not classroom_code:
            raise ValidationError({'classroom': '請選擇教室'})
        if not date_str:
            raise ValidationError({'date': '請選擇日期'})
        if not time_slot:
            raise ValidationError({'time_slot': '請選擇時段'})
        
        # 驗證教室存在
        try:
            classroom = Classroom.objects.get(room_code=classroom_code)
        except Classroom.DoesNotExist:
            raise ValidationError({'classroom': '教室不存在，請重新選擇'})
        
        # 驗證日期格式並檢查是否為過去日期
        try:
            reservation_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            if reservation_date < date_class.today():
                raise ValidationError({'date': '不能預約過去的日期'})
        except ValueError:
            raise ValidationError({'date': '日期格式錯誤'})
        
        # 檢查該時段是否已被預約
        conflict = Reservation.objects.filter(
            classroom=classroom,
            date=reservation_date,
            time_slot=time_slot,
            status__in=['pending', 'approved']
        ).exists()
        
        if conflict:
            raise ValidationError({'detail': f'教室 {classroom_code} 在 {date_str} {time_slot} 已被預約，請選擇其他時段'})
        
        # serializer 會自動處理 classroom (透過 SlugRelatedField)
        serializer.save(
            user=self.request.user,
            status="pending"
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


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_reservation_status(request, pk):
    """
    PATCH /api/reservations/<id>/status/
    
    管理員更新預約狀態（批准/拒絕）
    
    請求 body：
    {
        "status": "approved" 或 "rejected"
    }
    """
    # 檢查是否為管理員
    if not request.user.is_staff:
        return Response(
            {"error": "只有管理員可以審核預約"}, 
            status=403
        )
    
    try:
        reservation = Reservation.objects.get(pk=pk)
    except Reservation.DoesNotExist:
        return Response(
            {"error": "預約不存在"}, 
            status=404
        )
    
    new_status = request.data.get('status')
    
    # 驗證狀態值
    valid_statuses = ['approved', 'rejected']
    if new_status not in valid_statuses:
        return Response(
            {"error": f"狀態必須是 {valid_statuses} 其中之一"}, 
            status=400
        )
    
    # 檢查預約是否已經被處理過
    if reservation.status in ['approved', 'rejected']:
        return Response(
            {"error": f"此預約已經是『{dict(reservation.STATUS_CHOICES).get(reservation.status)}』狀態，無法再次審核"}, 
            status=400
        )
    
    # 更新狀態
    old_status = reservation.status
    reservation.status = new_status
    reservation.save()
    
    serializer = ReservationSerializer(reservation)
    return Response(serializer.data)

