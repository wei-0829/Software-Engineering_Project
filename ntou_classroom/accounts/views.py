from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, LoginSerializer
from accounts.services import send_verification, verify_code

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

        if not account:
            return Response({"detail": "缺少 account"}, status=status.HTTP_400_BAD_REQUEST)
        if not code:
            return Response({"detail": "缺少驗證碼"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            verify_code(account, code)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
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


class SendVerificationView(APIView):
    """
    POST /api/auth/send_verification/
    - 送出 email 驗證碼
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("account") or "").strip()
        name = request.data.get("name")
        if not email:
            return Response({"detail": "缺少 account(email)"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            return Response({"detail": "此帳號已存在，請直接登入或更換帳號"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_verification(email)
            return Response({"detail": "驗證碼已寄出"}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": e.message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyCodeView(APIView):
    """
    POST /api/auth/verify_code/
    - 驗證使用者輸入的驗證碼
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("account") or "").strip()
        code = (request.data.get("code") or "").strip()
        if not email or not code:
            return Response({"detail": "缺少 account 或 code 欄位"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            verify_code(email, code)
            return Response({"detail": "驗證成功"}, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"detail": e.message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({"detail": "驗證失敗"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
