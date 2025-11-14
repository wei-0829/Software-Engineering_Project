# accounts/services.py
import re
import logging
import random
from django.conf import settings
from django.core.mail import send_mail, BadHeaderError
from django.core.exceptions import ValidationError
from django.utils import timezone
from accounts.models import EmailVerification

logger = logging.getLogger(__name__)
EMAIL_PATTERN = re.compile(r'^[A-Za-z0-9._%+-]+@email\.ntou\.edu\.tw$', re.IGNORECASE)


def verify_code(email, user_input_code):
    # 1. 取資料
    try:
        record = EmailVerification.objects.get(email=email)
    except EmailVerification.DoesNotExist:
        raise ValidationError("請先寄送驗證碼")

    # 2. 過期
    if record.is_expired():
        record.delete()
        raise ValidationError("驗證碼已過期，請重新寄送")

    # 3. 比對成功
    if record.code == user_input_code:
        record.delete()
        return True

    # 4. 比對失敗 → 次數 +1
    record.attempts += 1
    if record.attempts >= 3:
        record.delete()
        raise ValidationError("嘗試次數過多，請重新寄送驗證碼")
    else:
        record.save()
        raise ValidationError("驗證碼錯誤")

def generate_code():
    return str(random.randint(100000, 999999))


def validate_ntou_email(email):
    if not EMAIL_PATTERN.match(email):
        raise ValidationError("請使用海大學校帳號")


def send_verification(email, code=None, subject="教室租借系統-郵件驗證", from_email=None):
    validate_ntou_email(email)

    if code is None:
        code = generate_code()

    if from_email is None:
        from_email = getattr(settings, "EMAIL_HOST_USER", None)
        if not from_email:
            raise ValueError("未設定寄件者 email (DEFAULT_FROM_EMAIL or EMAIL_HOST_USER)")

    message = f"你的驗證碼是：{code}"

    try:
        sent = send_mail(subject, message, from_email, [email], fail_silently=False)

    except BadHeaderError:
        raise ValidationError("郵件標頭錯誤")
    except Exception as e:
        # 可加 logging
        logger.exception("寄信失敗: %s", e)
        raise ValidationError("寄信失敗，請稍後再試")

    # Django send_mail 回傳成功寄出去的信件數
    if sent == 0:
        raise ValidationError("郵件寄送失敗（可能是收件者不存在）")

    # 儲存驗證碼
    EmailVerification.objects.update_or_create(
    email=email,
    defaults={
        "code": code,
        "created_at": timezone.now(),
        "attempts": 0
    }
)
