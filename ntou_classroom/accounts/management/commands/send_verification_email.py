# accounts/management/commands/send_verification_email.py
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError
from accounts.services import send_verification

class Command(BaseCommand):
    help = "Send a verification email to the given address with the provided code."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="Recipient email address")

    def handle(self, *args, **options):
        email = options["email"]
        try:
            ok = send_verification(email)
            if ok:
                self.stdout.write(self.style.SUCCESS(f"✅ 成功！驗證郵件已發送到 {email}"))
            else:
                raise CommandError("寄信失敗（send_mail 返回 0）")
        except ValidationError as e:
            raise CommandError(f"驗證錯誤：{e}")
        except Exception as e:
            raise CommandError(f"發生錯誤：{e}")