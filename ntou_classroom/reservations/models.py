from django.db import models
from django.contrib.auth.models import User
from rooms.models import Classroom


class Reservation(models.Model):
    STATUS_CHOICES = [
        ("pending", "待審核"),
        ("approved", "已通過"),
        ("rejected", "已退回"),
        ("cancelled", "已取消"),
    ]

    classroom = models.ForeignKey(
        Classroom,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    date = models.DateField()
    time_slot = models.CharField(max_length=20)  # 之後前端傳 "1-2"、"3-4" 這種
    reason = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("classroom", "date", "time_slot")
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.date} {self.time_slot} {self.classroom} - {self.user.username}"
