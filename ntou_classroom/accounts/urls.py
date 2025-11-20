from django.urls import path
from .views import RegisterView, LoginView

"""
accounts/urls.py

此模組負責處理「帳號相關 API」的路由設定。

最終完整路徑會變成：
- POST /api/auth/register/
- POST /api/auth/login/

這些路由會在 backend/urls.py 使用：
path("api/auth/", include("accounts.urls"))
進行 prefix 統一。
"""

urlpatterns = [
    # 註冊 API：POST /api/auth/register/
    path("register/", RegisterView.as_view(), name="register"),

    # 登入 API：POST /api/auth/login/
    path("login/", LoginView.as_view(), name="login"),
]
