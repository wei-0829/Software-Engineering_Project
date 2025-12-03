# rooms/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Classroom
from .serializers import ClassroomSerializer, ClassroomListSerializer, BuildingSerializer


class ClassroomPagination(PageNumberPagination):
    """教室列表分頁設定"""
    page_size = 20  # 每頁 20 筆
    page_size_query_param = 'page_size'
    max_page_size = 100


class ClassroomViewSet(viewsets.ModelViewSet):
    """
    教室查詢 API ViewSet
    
    提供以下端點：
    - GET /api/rooms/classrooms/              # 取得教室列表（支援進階搜尋、分頁、排序）
    - GET /api/rooms/classrooms/{room_code}/  # 取得單一教室詳情
    - POST /api/rooms/classrooms/             # 新增教室 (僅管理員)
    - PUT /api/rooms/classrooms/{room_code}/  # 更新教室 (僅管理員)
    - PATCH /api/rooms/classrooms/{room_code}/# 部分更新教室 (僅管理員)
    - DELETE /api/rooms/classrooms/{room_code}/# 刪除教室 (僅管理員)
    - GET /api/rooms/classrooms/buildings/    # 取得所有大樓列表
    """
    queryset = Classroom.objects.filter(is_active=True)
    serializer_class = ClassroomSerializer
    lookup_field = 'room_code'
    pagination_class = ClassroomPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['capacity', 'room_code', 'building']
    ordering = ['building', 'room_code']  # 預設排序
    
    def get_serializer_class(self):
        """
        列表使用簡化版 serializer，詳情使用完整版
        """
        if self.action == 'list':
            return ClassroomListSerializer
        return ClassroomSerializer

    def get_permissions(self):
        """
        根據 action 決定權限：
        - 讀取操作 (list, retrieve, buildings, stats) -> 任何人都可以
        - 寫入操作 (create, update, partial_update, destroy) -> 僅限管理員
        """
        if self.action in ['list', 'retrieve', 'buildings', 'stats']:
            return [AllowAny()]
        return [IsAdminUser()]
    
    def get_queryset(self):
        """
        根據查詢參數過濾教室
        
        支援的查詢參數：
        - building: 大樓代碼（例如：INS, ECG）
        - search: 關鍵字搜尋（教室代碼或名稱）
        - min_capacity: 最低容納人數
        - has_projector: 是否有投影機（true/false）
        - has_whiteboard: 是否有白板（true/false）
        - has_mic: 是否有麥克風（true/false）
        - has_network: 是否有網路（true/false）
        """
        queryset = super().get_queryset()
        
        # 按大樓過濾
        building = self.request.query_params.get('building')
        if building:
            queryset = queryset.filter(building=building)
        
        # 關鍵字搜尋（教室代碼或名稱）
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(room_code__icontains=search) |
                Q(name__icontains=search)
            )
        
        # 最低容納人數
        min_capacity = self.request.query_params.get('min_capacity')
        if min_capacity:
            try:
                queryset = queryset.filter(capacity__gte=int(min_capacity))
            except ValueError:
                pass  # 忽略無效的數字
        
        # 設備過濾
        has_projector = self.request.query_params.get('has_projector')
        if has_projector and has_projector.lower() == 'true':
            queryset = queryset.filter(has_projector=True)
        
        has_whiteboard = self.request.query_params.get('has_whiteboard')
        if has_whiteboard and has_whiteboard.lower() == 'true':
            queryset = queryset.filter(has_whiteboard=True)
        
        has_mic = self.request.query_params.get('has_mic')
        if has_mic and has_mic.lower() == 'true':
            queryset = queryset.filter(has_mic=True)
        
        has_network = self.request.query_params.get('has_network')
        if has_network and has_network.lower() == 'true':
            queryset = queryset.filter(has_network=True)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='buildings')
    @method_decorator(cache_page(60 * 15))  # 快取 15 分鐘
    def buildings(self, request):
        """
        GET /api/rooms/classrooms/buildings/
        
        取得所有大樓列表，包含每棟大樓的教室數量
        
        回傳格式：
        [
            {
                "code": "INS",
                "name": "資工系館",
                "classroom_count": 4
            },
            ...
        ]
        """
        # 嘗試從快取取得
        cache_key = 'buildings_list'
        buildings_data = cache.get(cache_key)
        
        if buildings_data is None:
            # 用一次查詢取得所有大樓的教室數量（效能優化）
            building_counts = dict(
                Classroom.objects.filter(is_active=True)
                .values('building')
                .annotate(count=Count('id'))
                .values_list('building', 'count')
            )
            
            # 組合資料
            buildings_data = []
            for code, name in Classroom.BUILDINGS:
                count = building_counts.get(code, 0)
                if count > 0:  # 只回傳有教室的大樓
                    buildings_data.append({
                        'code': code,
                        'name': name,
                        'classroom_count': count
                    })
            
            # 存入快取（15 分鐘）
            cache.set(cache_key, buildings_data, 60 * 15)
        
        serializer = BuildingSerializer(buildings_data, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        GET /api/rooms/classrooms/stats/
        
        取得教室統計資訊
        
        回傳格式：
        {
            "total_classrooms": 13,
            "total_capacity": 600,
            "avg_capacity": 46,
            "buildings_count": 5,
            "equipment_stats": {
                "has_projector": 10,
                "has_whiteboard": 12,
                "has_mic": 5
            }
        }
        """
        from django.db.models import Sum, Avg
        
        queryset = Classroom.objects.filter(is_active=True)
        
        stats_data = {
            'total_classrooms': queryset.count(),
            'total_capacity': queryset.aggregate(Sum('capacity'))['capacity__sum'] or 0,
            'avg_capacity': int(queryset.aggregate(Avg('capacity'))['capacity__avg'] or 0),
            'buildings_count': queryset.values('building').distinct().count(),
            'equipment_stats': {
                'has_projector': queryset.filter(has_projector=True).count(),
                'has_whiteboard': queryset.filter(has_whiteboard=True).count(),
                'has_mic': queryset.filter(has_mic=True).count(),
            }
        }
        
        return Response(stats_data)