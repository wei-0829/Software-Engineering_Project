# rooms/management/commands/seed_buildings.py
from django.core.management.base import BaseCommand
from django.db import transaction
from rooms.models import Building

# 校內系館清單（名稱, 代碼）
BUILDINGS = [
    # 左欄
    ("水生動物實驗中心", "AAC"),
    ("電算中心三樓", "CC3"),
    ("生命科學院館", "CLS"),
    ("電機二館", "EE2"),
    ("環漁系館", "FSH"),
    ("綜合二館", "GH2"),
    ("綜合研究中心", "GRC"),
    ("河工一館", "HR1"),
    ("海工館", "HRE"),
    ("沛華大樓", "IVY"),          
    ("海事大樓", "MAF"),
    ("機械B館", "MEB"),
    ("食品科學館", "MFS"),
    ("造船系館", "NVA"),
    ("海空大樓", "SAH"),
    ("育樂館", "STA"),
    ("技術大樓", "TEC"),
    ("學生活動中心", "SAC"),
    ("海大意象館(海洋夢想基地)", "ODB"),
    ("電資醫綜合教學大樓", "ECG"),
    # 右欄
    ("人文大樓", "BOH"),
    ("工學院大樓", "CE-"),
    ("電機一館", "EE1"),
    ("第一餐廳", "FRB"),
    ("綜合一館", "GH1"),
    ("綜合三館", "GH3"),
    ("體育館", "GYM"),
    ("河工二館", "HR2"),
    ("資工系館", "INS"),
    ("圖書館大樓", "LIB"),
    ("機械A館", "MEA"),
    ("食科工程館", "MFE"),
    ("商船大樓", "NAV"),
    ("海洋系館", "OCE"),
    ("體育場地", "SPF"),
    ("航管大樓", "STM"),
    ("空蝕水槽", "UAH"),
    ("行政大樓", "ADM"),
    ("食安所館", "FSB"),
    ("馬祖校區教學大樓", "MZ-"),
]

class Command(BaseCommand):
    help = "匯入校內系館清單（若已存在則更新名稱/代碼）"

    def handle(self, *args, **kwargs):
        created, updated = 0, 0
        with transaction.atomic():
            has_code = hasattr(Building, "code")
            for name, code in BUILDINGS:
                if has_code:
                    obj, is_created = Building.objects.update_or_create(
                        code=code, defaults={"name": name}
                    )
                else:
                    # 無 code 欄位時，以 name 為唯一鍵
                    obj, is_created = Building.objects.update_or_create(
                        name=name, defaults={}
                    )
                created += 1 if is_created else 0
                updated += 0 if is_created else 1

        self.stdout.write(self.style.SUCCESS(
            f"完成：新增 {created} 筆，更新 {updated} 筆（共 {len(BUILDINGS)} 筆）"
        ))
