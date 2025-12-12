# reservations/views.py

from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q

from datetime import datetime, timedelta, date as date_class


from .models import Reservation
from .serializers import ReservationSerializer
from rooms.models import Classroom
from blacklist.models import Blacklist



class ReservationListCreateView(generics.ListCreateAPIView):
    """
    GET：
    - view_all=true  → 管理員查看所有預約（審核用）
    - view_all=false → 使用者只看自己的預約（歷史紀錄）

    POST：
    - 建立新預約（黑名單者不可預約）
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        view_all = self.request.query_params.get("view_all", "false").lower() == "true"

        if user.is_staff and view_all:
            return (
                Reservation.objects
                .select_related("classroom", "user")
                .order_by("-date", "-created_at")
            )

        return (
            Reservation.objects
            .filter(user=user)
            .select_related("classroom")
            .order_by("-date", "-created_at")
        )

    def perform_create(self, serializer):

        from rest_framework.exceptions import PermissionDenied, ValidationError

        # 1️⃣ 黑名單檢查
        if Blacklist.objects.filter(user=self.request.user).exists():
            raise PermissionDenied("你已被列入黑名單，無法預約。")

        # 2️⃣ 取得參數
        classroom_code = self.request.data.get("classroom")
        date_str = self.request.data.get("date")
        time_slot = self.request.data.get("time_slot")

        # 3️⃣ 必填驗證
        if not classroom_code:
            raise ValidationError({"classroom": "請選擇教室"})
        if not date_str:
            raise ValidationError({"date": "請選擇日期"})
        if not time_slot:
            raise ValidationError({"time_slot": "請選擇時段"})

        # 4️⃣ 驗證教室存在
        try:
            classroom = Classroom.objects.get(room_code=classroom_code)
        except Classroom.DoesNotExist:
            raise ValidationError({"classroom": "教室不存在，請重新選擇"})

        # 5️⃣ 驗證日期格式 & 不可過去
        try:
            reservation_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            if reservation_date < date_class.today():
                raise ValidationError({"date": "不能預約過去的日期"})
        except ValueError:
            raise ValidationError({"date": "日期格式錯誤，應為 YYYY-MM-DD"})

        # 6️⃣ 衝突檢查（pending / approved 都算被佔用）
        conflict = Reservation.objects.filter(
            classroom=classroom,
            date=reservation_date,
            time_slot=time_slot,
            status__in=["pending", "approved"],
        ).exists()

        if conflict:
            raise ValidationError({
                "detail": f"教室 {classroom_code} 在 {date_str} {time_slot} 已被預約，請選擇其他時段"
            })

        # 7️⃣ 建立預約（只存一次）
        serializer.save(
            user=self.request.user,
            status="pending"
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def occupied_slots(request):
    """
    GET /api/reservations/occupied/

    查詢特定教室在指定日期範圍內的已預約時段
    """
    classroom_code = request.query_params.get("classroom")

    if not classroom_code:
        return Response({"error": "缺少必填參數：classroom"}, status=400)

    date_from_str = request.query_params.get("date_from")
    date_to_str = request.query_params.get("date_to")

    # 預設：今天起兩週
    if date_from_str:
        try:
            date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "date_from 格式錯誤"}, status=400)
    else:
        date_from = datetime.now().date()

    if date_to_str:
        try:
            date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "date_to 格式錯誤"}, status=400)
    else:
        date_to = date_from + timedelta(days=14)

    reservations = Reservation.objects.filter(
        classroom__room_code=classroom_code,
        date__gte=date_from,
        date__lte=date_to,
        status__in=["pending", "approved"],
    ).select_related("classroom", "user").order_by("date", "time_slot")

    result = [
        {
            "date": r.date.strftime("%Y-%m-%d"),
            "time_slot": r.time_slot,
            "status": r.status,
            "user": r.user.username if r.user else None,
        }
        for r in reservations
    ]

    return Response(result)


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
def update_reservation_status(request, pk):
    """
    PATCH /api/reservations/<id>/status/
    管理員審核預約（approved / rejected）
    """
    if not request.user.is_staff:
        return Response({"error": "只有管理員可以審核預約"}, status=403)

    try:
        reservation = Reservation.objects.get(pk=pk)
    except Reservation.DoesNotExist:
        return Response({"error": "預約不存在"}, status=404)

    new_status = request.data.get("status")
    if new_status not in ["approved", "rejected"]:
        return Response({"error": "狀態必須是 approved 或 rejected"}, status=400)

    if reservation.status in ["approved", "rejected"]:
        return Response({"error": "此預約已經審核完成"}, status=400)

    reservation.status = new_status
    reservation.save()

    serializer = ReservationSerializer(reservation)
    return Response(serializer.data)

     
    


