from django.contrib import admin
from .models import Building, Equipment, Room

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    search_fields = ["name", "code"]

@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    search_fields = ["name"]

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name","building","capacity")
    list_filter  = ("building","equipments")
    search_fields = ("name","building__name","equipments__name")
    filter_horizontal = ("equipments",)

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

