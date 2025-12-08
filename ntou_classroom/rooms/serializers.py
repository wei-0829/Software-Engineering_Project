"""
Serializers for the rooms app
"""
from rest_framework import serializers
from .models import Classroom


class ClassroomListSerializer(serializers.ModelSerializer):
    """簡化版序列化器，用於列表顯示"""
    
    class Meta:
        model = Classroom
        fields = [
            'id',
            'room_code',
            'name',
            'building',
            'capacity',
            'has_projector',
            'has_whiteboard',
            'has_network',
            'has_mic',
            'is_active',
        ]


class ClassroomSerializer(serializers.ModelSerializer):
    """完整版序列化器，用於詳情顯示"""
    
    building_display = serializers.CharField(
        source='get_building_display',
        read_only=True
    )
    
    class Meta:
        model = Classroom
        fields = [
            'id',
            'room_code',
            'name',
            'building',
            'building_display',
            'capacity',
            'room_type',
            'has_projector',
            'has_screen',
            'has_whiteboard',
            'has_network',
            'has_mic',
            'has_speaker',
            'has_teacher_computer',
            'student_computer_count',
            'has_air_conditioner',
            'has_fan',
            'power_socket_count',
            'wheelchair_accessible',
            'equipment_note',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class BuildingSerializer(serializers.Serializer):
    """大樓序列化器（用於統計）"""
    
    code = serializers.CharField()
    name = serializers.CharField()
    classroom_count = serializers.IntegerField()
