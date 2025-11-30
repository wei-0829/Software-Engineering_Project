# rooms/serializers.py
from rest_framework import serializers
from .models import Classroom


class ClassroomListSerializer(serializers.ModelSerializer):
    """
    教室列表序列化器（簡化版）
    - 用於列表顯示，只回傳前端需要的欄位
    - 減少資料傳輸量
    """
    building_name = serializers.CharField(
        source='get_building_display', 
        read_only=True
    )
    room_type_name = serializers.CharField(
        source='get_room_type_display',
        read_only=True
    )
    
    class Meta:
        model = Classroom
        fields = [
            'room_code',
            'building',
            'building_name',
            'name',
            'capacity',
            'room_type',
            'room_type_name',
            'has_projector',
            'has_whiteboard',
            'has_mic',
        ]


class ClassroomSerializer(serializers.ModelSerializer):
    """
    教室序列化器
    - 用於 API 回傳教室資訊
    - building_name 會自動取得 BUILDINGS choices 的顯示名稱
    """
    building_name = serializers.CharField(
        source='get_building_display', 
        read_only=True
    )
    
    class Meta:
        model = Classroom
        fields = [
            'id',
            'room_code',
            'building',
            'building_name',
            'name',
            'capacity',
            'room_type',
            'has_projector',
            'has_whiteboard',
            'has_mic',
            'has_screen',
            'has_speaker',
            'has_teacher_computer',
            'student_computer_count',
            'has_air_conditioner',
            'has_fan',
            'power_socket_count',
            'wheelchair_accessible',
            'equipment_note',
            'is_active',
        ]
        read_only_fields = ['id', 'building_name']


class BuildingSerializer(serializers.Serializer):
    """
    大樓序列化器
    - 用於回傳大樓列表
    """
    code = serializers.CharField()
    name = serializers.CharField()
    classroom_count = serializers.IntegerField()
