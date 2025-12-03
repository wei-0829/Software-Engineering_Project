from django.urls import path
from .views import (
    RegisterView, 
    LoginView, 
    RefreshTokenView,
    SendVerificationView,
    ChangePasswordView,
    VerifyChangePasswordView
)

"""
accounts/urls.py

此模組負責處理「帳號相關 API」的路由設定。

最終完整路徑會變成：
- POST /api/auth/register/
- POST /api/auth/login/
- POST /api/auth/refresh/

這些路由會在 backend/urls.py 使用：
path("api/auth/", include("accounts.urls"))
進行 prefix 統一。
"""

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("send_verification_email/", SendVerificationView.as_view(), name="send_verification"),
    path("send_change_pwd/", ChangePasswordView.as_view(), name="change_pwd"),
    path("verify_change_pwd/",VerifyChangePasswordView.as_view(),name="verify_change_pwd")
]
