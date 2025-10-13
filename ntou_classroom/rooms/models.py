from django.db import models

class Building(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.code})" if self.code else self.name


class Equipment(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name



class Room(models.Model):
    name = models.CharField(max_length=50)
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name="rooms")
    capacity = models.PositiveIntegerField(default=30)
    equipments = models.ManyToManyField(Equipment, blank=True)
    location = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = ("building", "name")
        indexes = [models.Index(fields=["building", "capacity"])]

    def __str__(self):
        return f"{self.building.name} {self.name}"

