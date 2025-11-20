from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, LoginSerializer


class RegisterView(APIView):
    """
    POST /api/auth/register/
    - 使用 RegisterSerializer 建立新用戶
    - 回傳 id / account / name（前端登入畫面會用到）
    - 不需要登入即可呼叫（AllowAny）
    """
    permission_classes = [AllowAny]

    def post(self, request):
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
        # 將 request.data 丟給 serializer 進行驗證
        serializer = RegisterSerializer(data=request.data)

        # 若 serializer 驗證通過，save() 會建立 Django User
        if serializer.is_valid():
            user = serializer.save()

            # 回傳最基本的使用者資訊給前端
            return Response(
                {
                    "id": user.id,
                    "account": user.username,   # 我們把學校帳號塞到 username
                    "name": user.first_name,    # 姓名塞在 first_name
                },
                status=status.HTTP_201_CREATED,
            )

        # 若驗證失敗，回傳 serializer.errors
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
