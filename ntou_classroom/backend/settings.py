"""
Django settings for backend project.
整份檔案負責設定：
- app 註冊
- middleware
- MySQL 資料庫
- JWT + REST Framework
- CORS（前端可連後端）
- 語系 / 時區
"""

from pathlib import Path
import environ

# =========================================================
# 基本路徑設定 & 載入 .env（放 MySQL 密碼、資料庫名稱）
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# 使用 django-environ 讀取 .env
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")


# =========================================================
# 安全性 & Debug 模式
# =========================================================
SECRET_KEY = "django-insecure-##*2-5$4v%p7xs=m49d=rln8xe(ke4$cya*h@er8cjnm15r+9-"

# 開發時 True → Django 會顯示錯誤訊息
DEBUG = True

# 未來部署時必須改
ALLOWED_HOSTS = []


# =========================================================
# Installed Apps（啟用功能 & 註冊 app）
# =========================================================
INSTALLED_APPS = [
    # Django 內建 app
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # 第三方套件（DRF + JWT + CORS）
    "corsheaders",                   # 允許前端（5173）呼叫 API
    "rest_framework",                # Django REST Framework
    "rest_framework_simplejwt",      # JWT 驗證系統

    # 自己的後端 app（你們三人分工的地方）
    "accounts",       # 帳號登入 / 註冊（你負責的）
    "rooms",          # 教室資料
    "reservations",   # 預約資料
]

# REST Framework 設定（預設用 JWT 驗證）
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    )
}


# =========================================================
# Middleware（每個 request 都會經過這裡）
# =========================================================
MIDDLEWARE = [
    # ⭐ 必須放在第一個，否則 CORS 無效
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# =========================================================
# CORS 設定（允許前端連線）
# 前端用 Vite → http://localhost:5173
# =========================================================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# =========================================================
# URL conf / WSGI
# =========================================================
ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],    # 若要使用 templates，可以在此放路徑
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"


# =========================================================
# MySQL 資料庫設定（讀取 .env 變數）
# =========================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",  # 使用 MySQL
        "NAME": env("DB_NAME"),                # 資料庫名稱
        "USER": env("DB_USER"),                # 帳號
        "PASSWORD": env("DB_PASSWORD"),        # 密碼
        "HOST": env("DB_HOST", default="127.0.0.1"),
        "PORT": env("DB_PORT", default="3306"),
        "OPTIONS": {"charset": "utf8mb4"},      # 支援 emoji / 中文
    }
}



# =========================================================
# 密碼規則（登入系統預設規則）
# =========================================================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# =========================================================
# 語言與時區
# =========================================================
LANGUAGE_CODE = "zh-hant"       # 預設繁中
TIME_ZONE = "Asia/Taipei"       # 台灣時間

USE_I18N = True
USE_TZ = True


# =========================================================
# 靜態檔案設定
# =========================================================
STATIC_URL = "static/"


# =========================================================
# 自增主鍵設定
# =========================================================
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
