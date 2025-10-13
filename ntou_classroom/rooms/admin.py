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


