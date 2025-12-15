from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.contrib.auth.models import User
from .models import Blacklist


class BlacklistCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        is_blacklisted = Blacklist.objects.filter(user=request.user).exists()
        return Response({"blacklisted": is_blacklisted})

class BlacklistUsersView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        blacklisted_ids = set(Blacklist.objects.values_list("user_id", flat=True))

        users = list(User.objects.all().values(
            "id", "username", "email", "first_name", "last_name"
        ))

        normal = [u for u in users if u["id"] not in blacklisted_ids]
        blacklisted = [u for u in users if u["id"] in blacklisted_ids]

        return Response({
            "normal_users": normal,
            "blacklisted_users": blacklisted
        })


class BanUserView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        user_id = request.data.get("user_id")
        reason = request.data.get("reason", "")

        if not user_id:
            return Response({"detail": "user_id is required"}, status=400)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=404)

        obj, created = Blacklist.objects.get_or_create(
            user=user,
            defaults={"reason": reason}
        )

        if not created:
            return Response({"detail": "User already blacklisted"}, status=400)

        return Response({"detail": "banned"}, status=201)


class UnbanUserView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        user_id = request.data.get("user_id")

        if not user_id:
            return Response({"detail": "user_id is required"}, status=400)

        Blacklist.objects.filter(user_id=user_id).delete()
        return Response({"detail": "unbanned"}, status=200)
