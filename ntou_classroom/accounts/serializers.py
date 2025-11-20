from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    """
    用於處理註冊請求的 Serializer。

    前端會送：
      - account（學校帳號 → 對應 User.username）
      - name（姓名 → 對應 User.first_name）
      - password（密碼）

    我們不直接使用 User.username / User.first_name
    是因為前端欄位名稱不一樣，所以用自訂欄位 mapping。
    """
    account = serializers.CharField(write_only=True)     # 對應 Django User.username
    name = serializers.CharField(write_only=True)        # 對應 Django User.first_name
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "account", "name", "password"]

    def validate_account(self, value):
        """
        註冊前檢查帳號是否已存在（避免 duplicate username）。
        """
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("帳號已被使用")
        return value

    def create(self, validated_data):
        """
        建立 User 物件。
        使用 create_user() → Django 會自動做密碼雜湊（hash）
        """
        account = validated_data.pop("account")
        name = validated_data.pop("name")
        password = validated_data.pop("password")

        user = User.objects.create_user(
            username=account,
            first_name=name,
            password=password,   # create_user 會自動 hash 密碼
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    用於處理登入請求的 Serializer。

    前端會送：
      - account（對應 User.username）
      - password

    authenticate()：
      → Django 內建方法，會自動做密碼比對
      → 如果帳密錯誤就會回傳 None
    """
    account = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        account = attrs.get("account")
        password = attrs.get("password")

        # Django 內建帳號驗證流程
        user = authenticate(username=account, password=password)

        if not user:
            # 統一回傳錯誤訊息給前端
            raise serializers.ValidationError("帳號或密碼錯誤")

        # 驗證成功，將 user 放入 validated_data 回傳給 View 使用
        attrs["user"] = user
        return attrs
