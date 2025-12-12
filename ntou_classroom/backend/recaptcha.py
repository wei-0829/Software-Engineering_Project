import os
import requests

def verify_recaptcha(token: str, remote_ip: str | None = None) -> bool:
    secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not secret or not token:
        return False

    data = {
        "secret": secret,
        "response": token,
    }
    if remote_ip:
        data["remoteip"] = remote_ip

    try:
        r = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data=data,
            timeout=5,
        )
        result = r.json()
        return bool(result.get("success"))
    except Exception:
        return False
