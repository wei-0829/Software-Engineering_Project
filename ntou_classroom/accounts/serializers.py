from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import serializers


# -----------------------------
# 註冊 Serializer
# -----------------------------
class RegisterSerializer(serializers.ModelSerializer):
    """
    處理註冊資料：
    前端送：
      - account  → User.username
      - name     → User.first_name
      - password → 密碼
    """

    account = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["account", "name", "password"]

    def validate_account(self, value):
        """檢查帳號是否已存在"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("此帳號已被註冊")
        return value

    def create(self, validated_data):
        """建立使用者（自動 password hash）"""
        account = validated_data.pop("account")
        name = validated_data.pop("name")
        password = validated_data.pop("password")

        # Django 內建 create_user → 自動做密碼 hash
        user = User.objects.create_user(
            username=account,
            first_name=name,
            password=password,
            is_staff=False,
        )
        return user


# -----------------------------
# 登入 Serializer（一般帳密登入）
# -----------------------------
class LoginSerializer(serializers.Serializer):
    """
    處理登入：
      - account（對應 username）
      - password
    """

    account = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        """驗證帳號密碼"""
        account = attrs.get("account")
        password = attrs.get("password")

        # authenticate 會自動比對 hash
        user = authenticate(username=account, password=password)

        if not user:
            raise serializers.ValidationError("帳號或密碼錯誤")

        attrs["user"] = user
        return attrs
