from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    """
    前端送：
      - account → 學校帳號（對應 User.username）
      - name    → 姓名（對應 User.first_name）
      - password
    """

    account = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["account", "name", "password"]

    def validate_account(self, value):
        # 檢查帳號是否重複
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("此帳號已被註冊")
        return value

    def create(self, validated_data):
        account = validated_data["account"]
        name = validated_data["name"]
        password = validated_data["password"]

        # create_user 會自動幫你做密碼 hash
        user = User.objects.create_user(
            username=account,
            first_name=name,
            password=password,
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    前端送：
      - account（對應 User.username）
      - password
    """
    account = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        account = attrs.get("account")
        password = attrs.get("password")

        user = authenticate(username=account, password=password)

        if not user:
            raise serializers.ValidationError("帳號或密碼錯誤")

        # 後面 View 用得到 user
        attrs["user"] = user
        return attrs
