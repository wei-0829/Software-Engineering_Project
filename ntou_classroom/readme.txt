ntou_classroom/
├── backend/
│   ├── settings.py       <- Django 設定檔（資料庫、App、Middleware）
│   ├── urls.py           <- 路由設定（API 與後台）
│   ├── wsgi.py/asgi.py   <- 伺服器進入點
│
├── rooms/
│   ├── models.py         <- 定義 Building / Room / Equipment 資料模型
│   ├── admin.py          <- 後台註冊（顯示 Buildings / Rooms / Equipments）
│   ├── serializers.py    <- API 序列化層（之後會新增）
│   ├── views.py          <- API 視圖邏輯（之後會新增）
│   └── management/
│       └── commands/
│           ├── seed_buildings.py   <- 建立所有「系館／大樓」資料
│           └── seed_rooms.py       <- 為每棟館自動建立假教室與設備
│
├── accounts/             <- 使用者登入 / JWT 認證
├── reservations/         <- 教室租借邏輯
│
├── db.sqlite3            <- SQLite 資料庫（本機開發用）
├── requirements.txt      <- 套件列表
├── README.md             <- 專案說明文件
└── manage.py             <- Django 主控制入口


source venv/bin/activate        <- 啟動虛擬環境

python manage.py runserver      <- 啟動 Django 開發伺服器（http://127.0.0.1:8000/admin/）

python manage.py makemigrations     <- 產生資料庫遷移檔（依 models.py 變化）
python manage.py migrate            <- 實際將資料表結構寫入 SQLite

python manage.py createsuperuser    <- 建立後台登入帳號






