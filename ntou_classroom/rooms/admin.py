# rooms/admin.py
from django.contrib import admin
from .models import Classroom


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = (
        "building",
        "room_code",
        "name",
        "capacity",
        "room_type",
        "has_projector",
        "has_teacher_computer",
        "student_computer_count",
        "is_active",
    )
    list_filter = (
        "building",
        "room_type",
        "has_projector",
        "has_teacher_computer",
        "is_active",
    )
    search_fields = ("room_code", "name")
