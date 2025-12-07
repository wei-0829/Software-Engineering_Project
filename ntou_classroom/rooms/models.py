# rooms/models.py
from django.db import models


class Classroom(models.Model):
    # 校區 / 大樓（對應前端代碼）
    BUILDINGS = [
        ("INS", "資工系館"),
        ("ECG", "電資暨綜合教學大樓"),
        ("LIB", "圖書館大樓"),
        ("GH1", "綜合一館"),
        ("GH2", "綜合二館"),
    ]
    building = models.CharField(
        max_length=10,
        choices=BUILDINGS,
        verbose_name="大樓",
    )

    # 教室代號（如 CS201、E1-204）
    room_code = models.CharField(
        max_length=20,
        unique=True,            # 給前端 slug_field 用
        verbose_name="教室代碼",
    )

    # 可選的教室名稱（如「電腦教室」、「大講堂」）
    name = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="教室名稱",
    )

    # 座位數
    capacity = models.PositiveIntegerField(
        verbose_name="容納人數",
    )

    # 教室類型
    ROOM_TYPES = [
        ("NORMAL", "普通教室"),
        ("LAB", "電腦教室"),
        ("MEETING", "會議室"),
        ("LECTURE", "大講堂"),
        ("OTHER", "其他"),
    ]
    room_type = models.CharField(
        max_length=20,
        choices=ROOM_TYPES,
        default="NORMAL",
        verbose_name="教室類型",
    )

    # 常見設備（布林值）
    has_projector = models.BooleanField(default=False, verbose_name="投影機")
    has_screen = models.BooleanField(default=False, verbose_name="投影幕")
    has_whiteboard = models.BooleanField(default=True, verbose_name="白板")
    has_network = models.BooleanField(default=True, verbose_name="網路")

    has_mic = models.BooleanField(default=False, verbose_name="麥克風")
    has_speaker = models.BooleanField(default=False, verbose_name="喇叭系統")

    has_teacher_computer = models.BooleanField(default=False, verbose_name="教師電腦")
    student_computer_count = models.PositiveIntegerField(
        default=0,
        verbose_name="學生電腦數量",
    )

    has_air_conditioner = models.BooleanField(default=True, verbose_name="冷氣")
    has_fan = models.BooleanField(default=False, verbose_name="電風扇")

    power_socket_count = models.PositiveIntegerField(
        default=0,
        verbose_name="插座數量（估計即可）",
    )

    # 無障礙
    wheelchair_accessible = models.BooleanField(
        default=False,
        verbose_name="是否為無障礙教室",
    )

    # 備註欄
    equipment_note = models.TextField(
        blank=True,
        verbose_name="設備備註（特殊設備、限制等）",
    )

    # 系統欄位
    is_active = models.BooleanField(default=True, verbose_name="是否啟用")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="建立時間")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="最後更新時間")

    class Meta:
        verbose_name = "教室"
        verbose_name_plural = "教室列表"
        unique_together = ("building", "room_code")  # 同一大樓不能重複教室代號

    def __str__(self):
        return f"{self.get_building_display()} {self.room_code}"
