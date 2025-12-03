# rooms/management/commands/seed_classrooms.py
from django.core.management.base import BaseCommand
from rooms.models import Classroom


class Command(BaseCommand):
    help = '建立測試用的教室資料'

    def handle(self, *args, **options):
        # 清除舊資料
        Classroom.objects.all().delete()
        
        classrooms = [
            # 資工系館 (INS)
            {
                'building': 'INS',
                'room_code': 'INS201',
                'name': '資工系電腦教室',
                'capacity': 40,
                'room_type': 'LAB',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': False,
                'has_teacher_computer': True,
                'student_computer_count': 40,
            },
            {
                'building': 'INS',
                'room_code': 'INS202',
                'name': '資工系普通教室',
                'capacity': 30,
                'room_type': 'NORMAL',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': False,
            },
            {
                'building': 'INS',
                'room_code': 'INS301',
                'name': '專題討論室',
                'capacity': 20,
                'room_type': 'MEETING',
                'has_projector': False,
                'has_whiteboard': True,
                'has_mic': False,
            },
            {
                'building': 'INS',
                'room_code': 'INS302',
                'name': '會議教室',
                'capacity': 25,
                'room_type': 'MEETING',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': True,
                'has_speaker': True,
            },
            
            # 電資暨綜合教學大樓 (ECG)
            {
                'building': 'ECG',
                'room_code': 'ECG301',
                'name': '電資大樓電腦教室',
                'capacity': 60,
                'room_type': 'LAB',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': True,
                'has_teacher_computer': True,
                'student_computer_count': 60,
            },
            {
                'building': 'ECG',
                'room_code': 'ECG302',
                'name': '電資大樓普通教室',
                'capacity': 50,
                'room_type': 'NORMAL',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': False,
            },
            {
                'building': 'ECG',
                'room_code': 'ECG310',
                'name': '視聽教室',
                'capacity': 80,
                'room_type': 'LECTURE',
                'has_projector': True,
                'has_whiteboard': False,
                'has_mic': True,
                'has_speaker': True,
                'has_screen': True,
            },
            
            # 圖書館大樓 (LIB)
            {
                'building': 'LIB',
                'room_code': 'LIB410',
                'name': '圖書館研討室 A',
                'capacity': 12,
                'room_type': 'MEETING',
                'has_projector': False,
                'has_whiteboard': True,
                'has_mic': False,
            },
            {
                'building': 'LIB',
                'room_code': 'LIB411',
                'name': '圖書館研討室 B',
                'capacity': 16,
                'room_type': 'MEETING',
                'has_projector': False,
                'has_whiteboard': True,
                'has_mic': False,
            },
            
            # 綜合一館 (GH1)
            {
                'building': 'GH1',
                'room_code': 'GH101',
                'name': '綜一普通教室 101',
                'capacity': 45,
                'room_type': 'NORMAL',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': False,
            },
            {
                'building': 'GH1',
                'room_code': 'GH102',
                'name': '綜一普通教室 102',
                'capacity': 45,
                'room_type': 'NORMAL',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': False,
            },
            
            # 綜合二館 (GH2)
            {
                'building': 'GH2',
                'room_code': 'GH201',
                'name': '綜二講堂 201',
                'capacity': 120,
                'room_type': 'LECTURE',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': True,
                'has_speaker': True,
                'has_screen': True,
            },
            {
                'building': 'GH2',
                'room_code': 'GH202',
                'name': '綜二普通教室 202',
                'capacity': 60,
                'room_type': 'NORMAL',
                'has_projector': True,
                'has_whiteboard': True,
                'has_mic': False,
            },
        ]
        
        for data in classrooms:
            Classroom.objects.create(**data)
            self.stdout.write(
                self.style.SUCCESS(f'✓ 建立教室：{data["room_code"]} - {data["name"]}')
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'\n成功建立 {len(classrooms)} 間教室！')
        )
