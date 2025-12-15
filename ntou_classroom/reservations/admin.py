from django.contrib import admin
from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "classroom",
        "date",
        "time_slot",
        "status",
        "reason_preview",
        "created_at",
    )
    list_filter = ("status", "date", "classroom")
    search_fields = ("user__username", "user__email", "classroom__room_code", "reason")
    readonly_fields = ("created_at", "id")
    fieldsets = (
        ("基本資訊", {
            "fields": ("id", "user", "classroom", "created_at")
        }),
        ("預約詳情", {
            "fields": ("date", "time_slot", "status")
        }),
        ("借用用途", {
            "fields": ("reason",)
        }),
    )
    ordering = ("-date", "-created_at")

    def reason_preview(self, obj):
        """在列表中顯示借用用途的預覽（最多 50 字）"""
        if obj.reason:
            return obj.reason[:50] + ("..." if len(obj.reason) > 50 else "")
        return "（無）"
    reason_preview.short_description = "借用用途"
