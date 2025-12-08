# accounts/services.py
import logging
import hashlib
from enum import Enum
import random
import re
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import BadHeaderError, send_mail
from django.http import HttpResponse
from django.utils import timezone

logger = logging.getLogger(__name__)

# 僅允許海大 email
EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@email\.ntou\.edu\.tw$", re.IGNORECASE)

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,15}$")

# Redis/Cache 設定
CODE_TTL_SECONDS = getattr(settings, "EMAIL_CODE_TTL", 300)
MAX_ATTEMPTS = getattr(settings, "EMAIL_CODE_MAX_ATTEMPTS", 3)
CACHE_PREFIX = getattr(settings, "EMAIL_CODE_CACHE_PREFIX", "email_verification")

# 使用 Enum 來取代魔法字串，更安全且易於擴展
class VerificationPurpose(Enum):
    REGISTER = "register"
    CHANGE_PASSWORD = "change_password"


def _cache_key(email: str, purpose: VerificationPurpose) -> str:
    return f"{CACHE_PREFIX}:{purpose.value}:{email.lower()}"

def _hash_code(code: str) -> str:
    """使用 SHA256 對驗證碼進行雜湊"""
    return hashlib.sha256(code.encode()).hexdigest()


def generate_code():
    return str(random.randint(100000, 999999))


def valid_password(pw: str) -> bool:
    if not PASSWORD_PATTERN.match(pw):
        raise ValidationError("密碼應含有大小寫及數字，長度在8~15")

def validate_ntou_email(email: str):
    if not EMAIL_PATTERN.match(email):
        raise ValidationError("請使用海大學校帳號")


def send_verification(email: str, purpose: VerificationPurpose, subject="教室租借系統-郵件驗證", from_email=None):
    """
    寄送驗證碼並將驗證資料存到 Redis（透過 Django cache）。
    """
    validate_ntou_email(email)
    if(cache.get(_cache_key(email, purpose))):
        raise ValidationError("請勿頻繁寄送驗證碼")
    code = generate_code()
    from_email = getattr(settings, "EMAIL_HOST_USER", None)

    message = f"你的驗證碼是：{code}，有效時間為5分鐘\n發送時間:{timezone.now().strftime("%Y-%m-%d %H:%M:%S")}"

    try:
        sent = send_mail(subject, message, from_email, [email], fail_silently=False)
    except BadHeaderError:
        raise ValidationError("郵件標頭錯誤")
    except Exception as e:
        logger.exception("寄信失敗: %s", e)
        raise ValidationError("寄信失敗，請稍後再試")

    if sent == 0:
        raise ValidationError("郵件寄送失敗（可能是收件者不存在）")

    expires_at = timezone.now().timestamp() + CODE_TTL_SECONDS
    record = {"code_hash": _hash_code(code), "expires_at": expires_at, "attempts": 0}
    cache.set(_cache_key(email, purpose), record, timeout=CODE_TTL_SECONDS)
    return True


def verify_code(email: str, user_input_code: str, purpose: VerificationPurpose):
    """
    從 Redis/Cache 驗證驗證碼，失敗次數達上限會清除。
    """
    record = cache.get(_cache_key(email, purpose))
    if not record:
        raise ValidationError("請先寄送驗證碼")

    now_ts = timezone.now().timestamp()
    expires_at = record.get("expires_at", 0)

    if now_ts > expires_at:
        cache.delete(_cache_key(email, purpose))
        raise ValidationError("驗證碼已過期，請重新寄送")

    if record.get("code_hash") == _hash_code(user_input_code):
        cache.delete(_cache_key(email, purpose))
        return True

    # 錯誤處理與嘗試次數
    remaining = max(int(expires_at - now_ts), 1)

    attempts = int(record.get("attempts", 0)) + 1
    if attempts >= MAX_ATTEMPTS:
        cache.delete(_cache_key(email, purpose))
        raise ValidationError("嘗試次數過多，請重新寄送驗證碼")
    record.update({"attempts": attempts})
    cache.set(_cache_key(email, purpose), record, timeout=remaining)
    raise ValidationError("驗證碼錯誤")
