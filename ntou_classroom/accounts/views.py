from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, LoginSerializer
from accounts.services import send_verification, verify_code,valid_password
import re
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
        password =(request.data.get("password") or "").strip()
        if not account:
            return Response({"detail": "缺少 account"}, status=status.HTTP_400_BAD_REQUEST)
        if not code:
            return Response({"detail": "缺少驗證碼"}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"detail": "缺少密碼"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            valid_password(password)
            verify_code(account, code,"register:")
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
    - 驗證帳號密碼，產生 JWT token
    - 使用 LoginSerializer 驗證帳密
    - 驗證成功後由 SimpleJWT 建立 access & refresh token
    - 讓前端可以儲存 token 進行登入狀態維持
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data["user"]

        # 建立 JWT token
        refresh = RefreshToken.for_user(user)

        # 驗證 input（account / password）
        serializer = LoginSerializer(data=request.data)

        # 若失敗，直接回應錯誤，例如：帳號或密碼錯誤
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # serializer.validated_data["user"] 就是經過驗證後找到的 Django User
        user = serializer.validated_data["user"]

        # SimpleJWT：產生 refresh token + access token
        refresh = RefreshToken.for_user(user)

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
        except TokenError as e:
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
            send_verification(email,"register:")
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
            send_verification(email,"changepwd:")
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
            return Response({"detail":"無法使用相同密碼"},status=status.HTTP_400_BAD_REQUEST)
        try:
            valid_password(password)
            verify_code(account, code,"changepwd:")
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "驗證碼驗證失敗"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 更新密碼，若有傳 name 也一併更新
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
