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
        "created_at",
    )
    list_filter = ("status", "date", "classroom")
    search_fields = ("user__username", "classroom__room_code")
