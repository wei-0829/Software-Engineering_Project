from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, LoginSerializer
from accounts.services import send_verification, verify_code, valid_password, VerificationPurpose
import re

# ✅ reCAPTCHA 驗證（你要放在 ntou_classroom/backend/recaptcha.py）
from backend.recaptcha import verify_recaptcha

User = get_user_model()


class RegisterView(APIView):
    """
    POST /api/auth/register/
    - 使用 RegisterSerializer 建立新用戶
    - 回傳 id / account / name（前端登入畫面會用到）
    - 不需要登入即可呼叫（AllowAny）
    """
    permission_classes = [AllowAny]

    def post(self, request):
        account = (request.data.get("account") or "").strip()
        code = (request.data.get("code") or "").strip()
        password = (request.data.get("password") or "").strip()

        if not account:
            return Response({"detail": "缺少 account"}, status=status.HTTP_400_BAD_REQUEST)
        if not code:
            return Response({"detail": "缺少驗證碼"}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"detail": "缺少密碼"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            valid_password(password)
            verify_code(account, code, VerificationPurpose.REGISTER)
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "驗證碼驗證失敗"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "id": user.id,
                    "account": user.username,
                    "name": user.first_name,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    POST /api/auth/login/
    - 先驗證 reCAPTCHA（避免機器人直接打 API）
    - 驗證帳號密碼成功後產生 JWT token（access & refresh）
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # ✅ 1) reCAPTCHA 驗證（先擋）
        recaptcha_token = request.data.get("recaptcha_token")
        if not verify_recaptcha(recaptcha_token, request.META.get("REMOTE_ADDR")):
            return Response({"detail": "reCAPTCHA 驗證失敗，請再試一次"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ 2) 驗證帳密
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]

        # ✅ 3) 產生 JWT（refresh + access）
        refresh = RefreshToken.for_user(user)

        # 【關鍵修改】在 token payload 中加入角色資訊
        refresh["is_staff"] = user.is_staff
        refresh["is_superuser"] = user.is_superuser
        refresh.access_token["is_staff"] = user.is_staff
        refresh.access_token["is_superuser"] = user.is_superuser

        # 回傳 token 與使用者資訊給前端
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "account": user.username,
                    "name": user.first_name,
                },
            },
            status=status.HTTP_200_OK,
        )


class UpdateProfileView(APIView):
    """
    PATCH /api/auth/profile/
    - 更新使用者資訊（目前僅支援修改顯示名稱）
    - 需登入 (IsAuthenticated)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        new_name = (request.data.get("name") or "").strip()

        if not new_name:
            return Response({"detail": "名稱不能為空"}, status=status.HTTP_400_BAD_REQUEST)

        user.first_name = new_name
        user.save()

        return Response({"message": "更新成功", "name": user.first_name}, status=status.HTTP_200_OK)


class UpdatePasswordView(APIView):
    """
    POST /api/auth/change-password/
    - 修改密碼（需提供舊密碼）
    - 需登入 (IsAuthenticated)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not current_password or not new_password:
            return Response({"detail": "請提供舊密碼與新密碼"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            return Response({"detail": "舊密碼不正確"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            valid_password(new_password)
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({"detail": "密碼修改成功"}, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    """
    POST /api/auth/refresh/
    - 使用 refresh token 取得新的 access token
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "缺少 refresh token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            refresh = RefreshToken(refresh_token)
            return Response(
                {
                    "access": str(refresh.access_token),
                },
                status=status.HTTP_200_OK,
            )
        except TokenError:
            return Response(
                {"detail": "無效或過期的 refresh token"},
                status=status.HTTP_401_UNAUTHORIZED
            )


class SendVerificationView(APIView):
    """
    POST /api/auth/send_verification/
    - 送出 email 驗證碼
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("account") or "").strip()
        if not email:
            return Response({"detail": "缺少 account(email)"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=email).exists():
            return Response({"detail": "此帳號已存在，請直接登入或更換帳號"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_verification(email, VerificationPurpose.REGISTER)
            return Response({"detail": "驗證碼已寄出"}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": e.message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangePasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("account") or "").strip()

        if not email:
            return Response({"detail": "缺少 account(email)"}, status=status.HTTP_400_BAD_REQUEST)

        if not User.objects.filter(username=email).exists():
            return Response({"detail": "此帳不存在，請註冊新帳號"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_verification(email, VerificationPurpose.CHANGE_PASSWORD)
            return Response({"detail": "驗證碼已寄出"}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": e.message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyChangePasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        account = (request.data.get("account") or "").strip()
        code = (request.data.get("code") or "").strip()
        password = (request.data.get("password") or "").strip()

        if not account:
            return Response({"detail": "缺少 account"}, status=status.HTTP_400_BAD_REQUEST)
        if not code:
            return Response({"detail": "缺少驗證碼"}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"detail": "缺少新密碼"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(username=account).first()
        if not user:
            return Response({"detail": "找不到使用者"}, status=status.HTTP_404_NOT_FOUND)

        if user.check_password(password):
            return Response({"detail": "無法使用相同密碼"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            valid_password(password)
            verify_code(account, code, VerificationPurpose.CHANGE_PASSWORD)
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "驗證碼驗證失敗"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        user.set_password(password)
        user.save()

        return Response(
            {
                "id": user.id,
                "account": user.username,
                "name": user.first_name,
            },
            status=status.HTTP_200_OK,
        )
