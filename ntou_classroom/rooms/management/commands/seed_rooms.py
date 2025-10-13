from django.core.management.base import BaseCommand
from django.db import transaction
import random
from rooms.models import Building, Room, Equipment


class Command(BaseCommand):
    help = "為每棟 Building 自動生成假教室與設備"

    def handle(self, *args, **kwargs):
        Room.objects.all().delete()  # 清空舊的
        random.seed(42)  # 或拿掉這行讓它每次隨機

        default_equips = ["投影機", "冷氣", "白板", "麥克風", "電腦"]
        for eq in default_equips:
            Equipment.objects.get_or_create(name=eq)

        equipments = list(Equipment.objects.all())
        buildings = list(Building.objects.all())

        if not buildings:
            self.stdout.write(self.style.ERROR("沒有 Building，請先執行 seed_buildings"))
            return

        created = 0
        with transaction.atomic():
            for b in buildings:
                for i in range(random.randint(2, 5)):  # 每棟 2～5 間
                    room_name = f"{100 + i*100 + random.randint(1, 20)}"
                    capacity = random.choice([20, 30, 40, 50, 60, 80, 100])
                    room, is_created = Room.objects.get_or_create(
                        name=room_name,
                        building=b,
                        defaults={"capacity": capacity, "location": f"{random.randint(1, 5)}樓"},
                    )
                    if is_created:
                        # 隨機分配設備
                        chosen = random.sample(equipments, random.randint(1, 3))
                        room.equipments.set(chosen)
                        created += 1

        self.stdout.write(self.style.SUCCESS(f"✅ 成功建立 {created} 間教室"))
