# reservations/views.py

from datetime import datetime, timedelta, date as date_class

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMessage, send_mail
from django.core.validators import validate_email
from django.utils.timezone import localtime

from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from rooms.models import Classroom
from blacklist.models import Blacklist

from .models import Reservation
from .serializers import ReservationSerializer, ReservationListSerializer


class ReservationListCreateView(generics.ListCreateAPIView):
    """
    GET：
    - view_all=true  → 管理員查看所有預約（審核用）
    - view_all=false → 使用者只看自己的預約（歷史紀錄）
    - status=pending/approved/rejected/cancelled → 可選，進一步篩選狀態（建議管理員頁用 pending）
    - limit=1..500 → 可選，限制回傳筆數（預設 200）

    POST：
    - 建立新預約（黑名單者不可預約）
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        # ✅ GET 列表：用簡版，降低 payload 與序列化成本
        if self.request.method == "GET":
            return ReservationListSerializer
        # ✅ POST 建立：用完整版（含寫入用欄位）
        return ReservationSerializer

    def get_queryset(self):
        user = self.request.user
        view_all = self.request.query_params.get("view_all", "false").lower() == "true"

        # ✅ 新增：status 篩選
        status = self.request.query_params.get("status")  # pending/approved/rejected/cancelled

        # ✅ 新增：限制筆數，避免一次爆量
        try:
            limit = int(self.request.query_params.get("limit", 200))
        except (TypeError, ValueError):
            limit = 200
        limit = max(1, min(limit, 500))

        qs = Reservation.objects.all()

        if user.is_staff and view_all:
            qs = qs.select_related("classroom", "user")
        else:
            qs = qs.filter(user=user).select_related("classroom")

        if status:
            qs = qs.filter(status=status)

        # ✅ 建議列表排序：先看最新送出的申請
        qs = qs.order_by("-created_at")

        return qs[:limit]

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
        instance = serializer.save(
            user=self.request.user,
            status="pending"
        )

        # 8️⃣ 寄信通知所有管理員（Bcc）
        try:
            all_staff_usernames = User.objects.filter(is_staff=True).values_list("username", flat=True)
            staff_emails = []
            for username in all_staff_usernames:
                try:
                    validate_email(username)
                    staff_emails.append(username)
                except DjangoValidationError:
                    continue

            if staff_emails:
                created_at_local = localtime(instance.created_at)
                formatted_time = created_at_local.strftime("%Y年%m月%d日 %H時%M分%S秒")

                subject = f"【新預約通知】{instance.classroom.room_code} - {instance.date}"
                message = (
                    f"有新的教室預約申請待審核。\n\n"
                    f"申請人：{instance.user.get_full_name()}\n"
                    f"申請人電子郵件：{instance.user.username}\n"
                    f"教室：{instance.classroom.room_code}\n"
                    f"日期：{instance.date}\n"
                    f"預約時段：{instance.time_slot}\n"
                    f"申請時間: {formatted_time}\n"
                    f"請登入系統進行審核。"
                )

                email = EmailMessage(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    [settings.EMAIL_HOST_USER],  # To: 寄件者自己（避免收件者空）
                    staff_emails,  # Bcc: 所有管理員
                )
                email.send(fail_silently=True)
        except Exception as e:
            print(f"寄送通知信失敗: {e}")


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

    reservations = (
        Reservation.objects.filter(
            classroom__room_code=classroom_code,
            date__gte=date_from,
            date__lte=date_to,
            status__in=["pending", "approved"],
        )
        .select_related("classroom", "user")
        .order_by("date", "time_slot")
    )

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

    # 寄信通知申請者
    try:
        status_text = "已通過" if new_status == "approved" else "未通過"
        subject = f"【預約審核通知】{reservation.classroom.room_code} - {reservation.date} 審核結果"
        message = (
            f"親愛的 {reservation.user.get_full_name() or reservation.user.username} 您好：\n\n"
            f"您申請的教室預約已有審核結果。\n\n"
            f"教室：{reservation.classroom.room_code}\n"
            f"日期：{reservation.date}\n"
            f"時段：{reservation.time_slot}\n"
            f"審核結果：{status_text}\n\n"
            f"請登入系統查看詳細資訊。"
        )

        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [reservation.user.username],
            fail_silently=True,
        )
    except Exception as e:
        print(f"寄送審核通知信失敗: {e}")

    serializer = ReservationSerializer(reservation)
    return Response(serializer.data)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def cancel_reservation(request, pk):
    """
    DELETE /api/reservations/<id>/cancel/

    使用者取消自己的預約

    只能取消：
    - 自己的預約
    - pending 或 approved 狀態的預約
    """
    try:
        reservation = Reservation.objects.get(pk=pk)
    except Reservation.DoesNotExist:
        return Response({"error": "預約不存在"}, status=404)

    # 檢查是否為預約擁有者
    if reservation.user != request.user:
        return Response({"error": "只能取消自己的預約"}, status=403)

    # 檢查預約狀態是否可以取消
    if reservation.status not in ["pending", "approved"]:
        return Response(
            {"error": f"此預約狀態為『{dict(reservation.STATUS_CHOICES).get(reservation.status)}』，無法取消"},
            status=400,
        )

    # 更新狀態為已取消
    reservation.status = "cancelled"
    reservation.save()

    # 寄信通知申請者
    try:
        subject = f"【預約取消通知】{reservation.classroom.room_code} - {reservation.date}"
        message = (
            f"親愛的 {reservation.user.get_full_name() or reservation.user.username} 您好\n"
            f"您已成功取消以下教室預約：\n\n"
            f"教室：{reservation.classroom.room_code}\n"
            f"日期：{reservation.date}\n"
            f"時段：{reservation.time_slot}\n\n"
        )

        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [reservation.user.username],
            fail_silently=True,
        )
    except Exception as e:
        print(f"寄送取消通知信失敗: {e}")

    serializer = ReservationSerializer(reservation)
    return Response({
        "message": "預約已成功取消",
        "reservation": serializer.data
    })
