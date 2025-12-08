# rooms/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassroomViewSet

"""
教室查詢 API 路由設定

註冊 ClassroomViewSet 後會自動產生以下路由：
- GET    /api/rooms/classrooms/              # 取得教室列表（支援搜尋）
- GET    /api/rooms/classrooms/{room_code}/  # 取得單一教室詳情
- GET    /api/rooms/classrooms/buildings/    # 取得大樓列表
"""

router = DefaultRouter()
router.register(r'classrooms', ClassroomViewSet, basename='classroom')

urlpatterns = [
    path('', include(router.urls)),
]
