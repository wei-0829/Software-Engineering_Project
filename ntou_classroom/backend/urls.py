from django.contrib import admin
from django.urls import path, include

"""
backend/urls.py

整個 Django 專案的主 URL 路由設定。

所有 app（accounts / rooms / reservations ...）的路由，
都會在這裡透過 include() 統一掛上 prefix。

目前已啟用：
- /admin/    → Django 管理後台
- /api/auth/ → 登入、註冊相關 API（accounts.urls）
"""

urlpatterns = [
    # Django 預設後台管理介面
    path("admin/", admin.site.urls),

    # 帳號驗證相關 API
    # accounts/urls.py 會提供：
    #   POST /api/auth/register/
    #   POST /api/auth/login/
    path("api/auth/", include("accounts.urls")),
    path("api/reservations/", include("reservations.urls")),
]
