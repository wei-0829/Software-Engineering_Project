from django.urls import path
from .views import BlacklistCheckView, BlacklistUsersView, BanUserView, UnbanUserView

urlpatterns = [
    path("check/", BlacklistCheckView.as_view(), name="blacklist-check"),
    path("users/", BlacklistUsersView.as_view(), name="blacklist-users"),
    path("ban/", BanUserView.as_view(), name="blacklist-ban"),
    path("unban/", UnbanUserView.as_view(), name="blacklist-unban"),
]
