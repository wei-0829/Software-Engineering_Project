                    國立臺灣海洋大學 - 教室預約管理系統
                    NTOU Classroom Reservation System

專案概述
========
本系統是一個全方位的教室預約管理平台，專為國立臺灣海洋大學設計開發。
系統提供完整的教室查詢、預約、審核流程，並整合使用者認證、權限管理、
即時預約狀態查詢等功能，大幅提升校園空間資源的使用效率。


核心功能特色
============

1. 教室搜尋系統
   ----------------
   • 多條件過濾器：支援關鍵字、容納人數、設備需求（投影機、白板、麥克風、網路）
   • 即時可用性查詢：動態顯示教室在特定時段的預約狀態
   • 大樓分類導航：將全校教室依大樓分類，提供直覺的階層式瀏覽
   • 教室詳情展示：完整顯示教室設備清單、座位數、教室類型等資訊

2. 視覺化週曆預約介面
   ------------------
   • 直觀的週曆表格：以週為單位顯示教室使用狀況
   • 時段即點即約：點擊空白時段即可提交預約申請
   • 即時衝突檢測：前端顯示已被預約的時段，避免重複預約
   • 自動狀態更新：預約成功後立即重新載入最新時段狀態

3. 完整預約審核流程
   ----------------
   • 三階段狀態管理：pending（待審核）→ approved（已批准）/ rejected（已拒絕）
   • 管理員審核介面：僅限管理員查看所有使用者的預約申請
   • 批准/拒絕操作：一鍵處理預約請求，並防止重複審核
   • 權限分離設計：一般使用者只能查看自己的預約，管理員可查看全部

4. 使用者認證與權限系統
   --------------------
   • JWT Token 認證：採用業界標準的 JSON Web Token 進行身份驗證
   • 自動 Token 刷新：在 Token 過期前自動刷新，提供無縫使用體驗
   • Email 驗證機制：註冊及密碼重設均需通過 Email 驗證碼
   • 角色權限控管：區分一般使用者與管理員，實現細緻的權限管理

5. 預約歷史紀錄
   ------------
   • 個人預約清單：查看自己所有的預約紀錄及狀態
   • 狀態追蹤：即時顯示預約的審核進度（待審核/已批准/已拒絕）
   • 詳細資訊展示：包含教室、日期、時段、用途、建立時間等完整資訊


技術架構與設計亮點
==================

後端技術棧
----------
• Django 5.2.7 + Django REST Framework
  - 採用 MTV 架構模式，實現前後端分離
  - RESTful API 設計，遵循 HTTP 標準
  - 完整的 ORM 支援，簡化資料庫操作

• JWT 身份驗證機制
  - djangorestframework-simplejwt 套件
  - Access Token (15分鐘有效期) + Refresh Token (1天有效期)
  - 自動刷新機制，減少使用者重新登入次數

• MySQL 雲端資料庫 (Aiven)
  - 資料持久化在雲端，支援多人協作開發
  - 高可用性架構，確保服務穩定性
  - 遠端存取設定，方便團隊成員共享資料

• Redis 快取系統
  - 15分鐘快取大樓列表，減少資料庫查詢
  - django-redis 整合，提升 API 回應速度
  - 適合靜態資料的快取策略

• 資料模型設計
  - Classroom: 教室基本資料（大樓、容納人數、設備清單）
  - Reservation: 預約紀錄（使用者、教室、日期、時段、狀態）
  - User: Django 內建使用者模型，擴充 is_staff 管理員權限
  - unique_together 約束：防止同一教室同一時段被重複預約


前端技術棧
----------
• React 19.2.0 + Hooks
  - 函數式組件 + Hook 設計模式
  - useState 管理本地狀態
  - useEffect 處理副作用（API 呼叫、資料載入）
  - useMemo 優化效能（避免不必要的重新計算）
  - 自訂 Hook (useAuth) 封裝認證邏輯

• Vite 7.2.2 開發環境
  - 極速的開發伺服器啟動時間
  - 熱模組替換 (HMR)，即改即看
  - 生產環境自動優化打包

• React Router DOM
  - 單頁應用 (SPA) 路由管理
  - 程式化導航 (navigate)
  - 受保護路由設計

• 響應式設計基礎
  - CSS Grid 與 Flexbox 佈局
  - 支援桌面端瀏覽體驗


核心技術
============

1. 預約衝突檢測機制
   ----------------
   前端：
   • 即時查詢已預約時段，視覺化顯示在週曆上
   • 點擊已預約時段時前端阻擋操作

   後端：
   • 雙重檢測機制：
     - 應用層檢查：在建立預約前先查詢資料庫是否存在衝突
     - 資料庫層約束：unique_together(classroom, date, time_slot)
   • 友善錯誤訊息：回傳具體的教室、日期、時段資訊
   • 過期預約防護：不允許預約過去的日期

   前端 UI → 後端邏輯 → 資料庫約束 


2. Token 自動刷新機制
   -------------------
   問題：Access Token 有效期短（15分鐘），頻繁要求重新登入影響使用體驗

   解決方案：
   • 攔截 401 Unauthorized 回應
   • 自動使用 Refresh Token 取得新的 Access Token
   • 重試原本失敗的請求
   • 只有 Refresh Token 也失效時才要求重新登入

   實作細節：
   ```javascript
   if (res.status === 401) {
     const newToken = await refreshAccessToken();
     if (newToken) {
       // 用新 token 重試請求
       res = await makeRequest(newToken);
     } else {
       // 導向登入頁
       navigate("/login");
     }
   }
   ```



3. 管理員權限控管
   --------------
   後端：
   • 基於 Django User.is_staff 欄位判斷
   • API 層級權限檢查：
     - IsAuthenticated：所有登入使用者
     - IsAdminUser：僅限管理員
   • 資料查詢權限：
     - view_all=true 參數：管理員可查看所有預約
     - 預設模式：只回傳當前使用者的預約
   • 審核權限：只有管理員可以更新預約狀態

   前端：
   • useAuth Hook 統一管理 isAdmin 狀態
   • 條件渲染：{isAdmin && <AdminPanel />}
   • 路由保護：管理員專屬頁面僅在 isAdmin=true 時顯示


4. 效能優化策略
   ------------
   後端：
   • select_related：減少 N+1 查詢問題
     Reservation.objects.select_related("classroom", "user")
   • Redis 快取：大樓列表快取 15 分鐘
   • 分頁機制：ClassroomPagination（每頁 20 筆，最多 100 筆）
   • 資料庫索引：classroom.room_code 設為 unique，自動建立索引

   前端：
   • useMemo：快取計算結果（教室過濾、大樓搜尋）
   • 避免不必要的重新渲染
   • 條件載入：只在需要時才發送 API 請求
   • 防止無限循環：useEffect 依賴項精確控制


API 端點設計
============

認證相關
--------
POST   /api/auth/register/                    註冊新使用者
POST   /api/auth/login/                       使用者登入
POST   /api/auth/refresh/                     刷新 Access Token
POST   /api/auth/send_verification_email/    發送註冊驗證碼
POST   /api/auth/send_change_pwd/            發送密碼重設驗證碼
POST   /api/auth/verify_change_pwd/          驗證並重設密碼

教室管理
--------
GET    /api/rooms/classrooms/                取得教室列表（支援多條件搜尋）
GET    /api/rooms/classrooms/{room_code}/    取得單一教室詳情
POST   /api/rooms/classrooms/                新增教室（管理員）
PUT    /api/rooms/classrooms/{room_code}/    更新教室（管理員）
DELETE /api/rooms/classrooms/{room_code}/    刪除教室（管理員）
GET    /api/rooms/classrooms/buildings/      取得大樓列表（含教室數量）
GET    /api/rooms/classrooms/stats/          教室統計資訊

預約管理
--------
GET    /api/reservations/                    取得預約列表
                                            ?view_all=true（管理員查看全部）
POST   /api/reservations/                    建立新預約
GET    /api/reservations/occupied/           查詢已預約時段
                                            ?classroom=INS201
                                            &date_from=2025-12-01
                                            &date_to=2025-12-07
PATCH  /api/reservations/{id}/status/        更新預約狀態（管理員審核）
                                            body: {"status": "approved" | "rejected"}


資料庫結構
==========

Classroom 教室資料表
--------------------
• id: 主鍵
• building: 大樓代碼（INS, ECG, LIB, GH1, GH2）
• room_code: 教室代碼（唯一，例如 INS201）
• name: 教室名稱（例如「電腦教室」）
• capacity: 容納人數
• room_type: 教室類型（NORMAL, LAB, MEETING, LECTURE, OTHER）
• has_projector: 是否有投影機
• has_screen: 是否有投影幕
• has_whiteboard: 是否有白板
• has_network: 是否有網路
• has_mic: 是否有麥克風
• has_speaker: 是否有喇叭
• has_teacher_computer: 是否有教師電腦
• student_computer_count: 學生電腦數量
• has_air_conditioner: 是否有冷氣
• power_socket_count: 插座數量
• wheelchair_accessible: 是否無障礙
• is_active: 是否啟用

Reservation 預約資料表
----------------------
• id: 主鍵
• classroom: 外鍵關聯 Classroom
• user: 外鍵關聯 User
• date: 預約日期（DATE）
• time_slot: 時段（例如 "10-12"）
• reason: 預約原因
• status: 狀態（pending, approved, rejected, cancelled）
• created_at: 建立時間（自動）

• 唯一約束：unique_together(classroom, date, time_slot)
  → 同一教室同一時段只能有一筆有效預約


開發環境設定
============

後端啟動
--------
1. 進入專案資料夾
   cd ntou_classroom

2. 啟動虛擬環境
   source ../venv/bin/activate

3. 安裝相依套件（首次）
   pip install -r requirements.txt

4. 執行資料庫遷移（首次）
   python manage.py migrate

5. 建立管理員帳號（首次）
   python manage.py createsuperuser

6. 啟動開發伺服器
   python manage.py runserver 8000

   後端網址：http://127.0.0.1:8000/
   管理後台：http://127.0.0.1:8000/admin/

前端啟動
--------
1. 進入專案根目錄
   cd /path/to/Software-Engineering_Project

2. 安裝相依套件（首次）
   npm install

3. 啟動開發伺服器
   npm run dev

   前端網址：http://localhost:5173/


專案結構說明
============

ntou_classroom/                     後端 Django 專案
├── backend/                        Django 主專案設定
│   ├── settings.py                 全域設定（資料庫、CORS、JWT）
│   ├── urls.py                     主路由配置
│   └── wsgi.py / asgi.py           部署用入口點
│
├── accounts/                       認證與使用者管理
│   ├── models.py                   （使用 Django 內建 User）
│   ├── serializers.py              使用者資料序列化
│   ├── views.py                    登入、註冊、驗證 API
│   └── urls.py                     認證相關路由
│
├── rooms/                          教室管理模組
│   ├── models.py                   Classroom 模型定義
│   ├── serializers.py              教室資料序列化
│   ├── views.py                    教室 CRUD API（ClassroomViewSet）
│   ├── urls.py                     教室相關路由
│   └── management/commands/        自訂管理指令
│       ├── seed_buildings.py       產生大樓資料
│       └── seed_classrooms.py      產生測試教室
│
├── reservations/                   預約管理模組
│   ├── models.py                   Reservation 模型定義
│   ├── serializers.py              預約資料序列化
│   ├── views.py                    預約 CRUD 與審核 API
│   └── urls.py                     預約相關路由
│
├── db.sqlite3                      本地開發資料庫（已改用 MySQL）
└── requirements.txt                Python 套件清單

src/                                前端 React 專案
├── App.jsx                         主要路由與頁面組合
├── Login.jsx                       登入/註冊/忘記密碼頁面
├── ClassroomBooking.jsx            教室預約主頁面（核心）
├── useAuth.js                      自訂認證 Hook
├── config/
│   └── api.js                      API 端點統一管理
└── assets/                         靜態資源


技術難點與解決方案
==================

難點一：JWT Token 過期處理
--------------------------
問題：
Access Token 有效期短，使用者操作時 Token 可能過期導致 401 錯誤

解決：
實作自動刷新機制，在每次 API 呼叫失敗時自動嘗試刷新 Token

技術細節：
• 攔截所有 API 回應
• 檢測 401 狀態碼
• 呼叫 /api/auth/refresh/ 取得新 Token
• 重試原本的請求
• Refresh Token 也過期才導向登入頁

難點二：預約時段的即時同步
--------------------------
問題：
多人同時預約時，前端顯示的時段狀態可能過時

解決：
• 每次進入教室頁面時載入最新預約狀態
• 預約成功後立即重新載入該教室的所有預約時段
• 使用後端 API 作為唯一真實來源

技術細節：
• 預約成功後呼叫 /api/reservations/occupied/
• 將回傳資料轉換成前端格式
• 更新 occupiedMap 狀態
• 週曆自動重新渲染

難點三：管理員與一般使用者的權限分離
------------------------------------
問題：
同一個 API 端點需要根據使用者身份回傳不同資料

解決：
• 後端使用查詢參數 view_all 控制
• 前端根據 isAdmin 狀態決定是否傳入 view_all=true
• 後端額外檢查 is_staff 權限

技術細節：
```python
def get_queryset(self):
    user = self.request.user
    view_all = self.request.query_params.get('view_all', 'false') == 'true'
    
    if user.is_staff and view_all:
        return Reservation.objects.all()
    
    return Reservation.objects.filter(user=user)
```

難點四：防止 useEffect 無限循環
-------------------------------
問題：
歷史紀錄頁面不斷發送 API 請求，造成伺服器負擔

原因：
useEffect 的依賴項設定不當，導致每次渲染都觸發

解決：
• 在 useEffect 開頭加入提早返回條件
• 只在真正需要時執行 API 呼叫
• 確保依賴項陣列只包含必要的狀態

技術細節：
```javascript
useEffect(() => {
  if (!showHistory) return;  // 提早返回
  
  fetchMyReservations();
}, [showHistory]);  // 只在 showHistory 變化時執行
```


技術棧總覽
==========

後端
----
• Python 3.11+
• Django 5.2.7
• Django REST Framework 3.15.2
• djangorestframework-simplejwt 5.3.1
• MySQL 8.0 (Aiven 雲端)
• Redis (django-redis 5.4.0)

前端
----
• React 19.2.0
• Vite 7.2.2
• React Router DOM 7.1.1

開發工具
--------
• Git 版本控制
• VS Code / PyCharm
• Postman API 測試
• Chrome DevTools


專案主要功能實現邏輯
====================

1. 使用者認證系統
   --------------
   
   【註冊流程】
   前端 (Login.jsx)：
   1. 使用者輸入帳號（email）→ 點擊「發送驗證碼」
   2. 呼叫 POST /api/auth/send_verification_email/
   3. 輸入驗證碼、密碼 → 送出註冊
   4. 呼叫 POST /api/auth/register/ (帶 account, password, code)
   5. 成功後提示註冊完成，切換回登入畫面
   
   後端 (accounts/views.py - RegisterView)：
   1. 接收 account, code, password
   2. 呼叫 verify_code() 驗證驗證碼是否正確
   3. 呼叫 valid_password() 檢查密碼強度
   4. 使用 Django User.objects.create_user() 建立使用者
   5. 回傳 user 基本資訊

   【登入流程】
   前端：
   1. 輸入帳號密碼 → 送出
   2. 呼叫 POST /api/auth/login/
   3. 後端驗證成功回傳 { access, refresh, user }
   4. 前端儲存到 localStorage：
      - access_token（15分鐘有效）
      - refresh_token（1天有效）
      - user、username
   5. 導向首頁
   
   後端 (LoginView)：
   1. 接收 account, password
   2. 使用 Django authenticate() 驗證
   3. 成功後使用 simplejwt 產生 Token：
      - RefreshToken.for_user(user)
      - 取得 access 和 refresh token
   4. 回傳 { access, refresh, user: {id, username, is_staff} }

   【Token 自動刷新機制】
   useAuth.js 實作：
   1. 當 API 回傳 401 Unauthorized
   2. 檢查 localStorage 有無 refresh_token
   3. 呼叫 POST /api/auth/refresh/ (帶 refresh token)
   4. 成功：更新 access_token，重試原本請求
   5. 失敗：清除登入資料，導向登入頁

2. 教室查詢系統
   ------------
   
   【教室載入流程】
   前端 (ClassroomBooking.jsx)：
   1. 使用者選擇大樓（如「資訊大樓 INS」）
   2. 呼叫 GET /api/rooms/classrooms/?building=INS
   3. 後端回傳該大樓的所有教室
   4. 前端顯示教室卡片列表（含設備資訊）

   【搜尋過濾】
   前端組合 API 參數：
   - ?search=電腦          (關鍵字搜尋)
   - &min_capacity=50      (最低容納人數)
   - &has_projector=true   (需要投影機)
   - &has_network=true     (需要網路)
   
   後端 (rooms/views.py - ClassroomViewSet.get_queryset())：
   1. 基礎查詢：Classroom.objects.filter(is_active=True)
   2. 按大樓過濾：.filter(building=building)
   3. 關鍵字搜尋：Q(room_code__icontains=search) | Q(name__icontains=search)
   4. 容納人數：.filter(capacity__gte=min_capacity)
   5. 設備過濾：.filter(has_projector=True, has_network=True, ...)
   6. select_related() 優化查詢
   7. 分頁處理：每頁 20 筆
   8. 回傳 JSON 列表

   【大樓列表 API】
   後端 (buildings() action)：
   1. 查詢所有大樓：.values('building').distinct()
   2. 統計每個大樓的教室數量：annotate(count=Count('id'))
   3. Redis 快取 15 分鐘
   4. 回傳 [{ code: 'INS', name: '資訊大樓', count: 4 }, ...]

3. 視覺化週曆預約
   --------------
   
   【週曆生成邏輯】
   前端 (WeekCalendar 組件)：
   1. 巢狀迴圈產生格子：
      for hour in 8..20:        # 8:00-21:00
        for day in 1..7:        # 週一到週日
          產生一個格子 (day-hour)
   
   2. 檢查格子狀態：
      - 查詢 occupiedMap[room] 是否包含此時段
      - occupied → 紅色 "is-occupied"
      - free → 綠色 "is-free"
   
   3. 點擊事件：
      - 已預約 → 無動作
      - 空白 → setSelected({ day, hour })
      - 顯示「預約」按鈕
   
   4. 確認預約：
      - 取得 start, end (如 10-12)
      - 呼叫 handleReserve({ room, day, start, end })

   【已預約時段載入】
   前端流程：
   1. 使用者選擇教室 → 觸發 fetchOccupiedSlots(room)
   2. 計算本週日期範圍（週一到週日）
   3. 呼叫 GET /api/reservations/occupied/
      ?classroom=INS201
      &date_from=2025-12-02
      &date_to=2025-12-08
   4. 後端回傳：
      [
        { date: "2025-12-03", time_slot: "10-12", status: "approved" },
        { date: "2025-12-04", time_slot: "14-16", status: "pending" }
      ]
   5. 前端轉換成格子座標：
      - 根據 date 計算是週幾 (day 1-7)
      - 解析 time_slot 得到 start, end
      - 儲存到 occupiedMap[room] = [{ day, start, end }, ...]
   6. WeekCalendar 使用 occupiedMap 渲染紅色格子
   
   後端 (reservations/views.py - occupied_slots)：
   1. 接收參數：classroom, date_from, date_to
   2. 查詢資料庫：
      Reservation.objects.filter(
        classroom__room_code=classroom,
        date__gte=date_from,
        date__lte=date_to,
        status__in=['pending', 'approved']  # 排除已拒絕和取消
      )
   3. 回傳格式：[{ date, time_slot, status, user }, ...]

4. 預約建立與驗證
   --------------
   
   【前端預約流程】
   handleReserve 函數：
   1. 檢查登入：localStorage 有無 access_token
   2. 計算真實日期：
      - 取得本週週一日期
      - 加上 (day - 1) 天
      - 轉換成 "YYYY-MM-DD" 格式
   3. 組合 payload：
      {
        classroom: "INS201",
        date: "2025-12-05",
        time_slot: "10-12",
        reason: ""
      }
   4. 發送 POST /api/reservations/
   5. 處理 Token 過期：
      - 401 → 自動刷新 Token → 重試
      - 成功 → alert 提示 + 重新載入已預約時段
      - 失敗 → 顯示錯誤訊息

   【後端驗證流程】
   ReservationListCreateView.perform_create()：
   
   驗證層級 1 - 欄位檢查：
   - classroom, date, time_slot 都不能為空
   - 缺少任一欄位 → 回傳 400 錯誤

   驗證層級 2 - 教室存在性：
   - Classroom.objects.get(room_code=classroom_code)
   - 不存在 → 回傳「教室不存在」

   驗證層級 3 - 日期驗證：
   - datetime.strptime(date_str, '%Y-%m-%d')
   - 檢查 reservation_date < today
   - 過去日期 → 回傳「不能預約過去的日期」

   驗證層級 4 - 衝突檢測：
   Reservation.objects.filter(
     classroom=classroom,
     date=date,
     time_slot=time_slot,
     status__in=['pending', 'approved']
   ).exists()
   - 有衝突 → 回傳「該時段已被預約，請選擇其他時段」

   驗證層級 5 - 資料庫約束：
   models.py 中定義：
   class Meta:
       unique_together = [['classroom', 'date', 'time_slot']]
   
   全部通過後：
   - serializer.save(user=request.user, status="pending")
   - 回傳 201 Created
   
   三層防護機制
   前端 UI 阻擋 → 後端邏輯檢查 → 資料庫約束

5. 管理員審核系統
   --------------
   
   【權限判斷】
   前端 (useAuth.js)：
   1. 解析 access_token 的 payload
   2. 檢查 is_staff 欄位
   3. 儲存到 isAdmin 狀態
   4. 條件渲染：{isAdmin && <RequestPanel />}
   
   後端：
   1. Django User 模型的 is_staff 欄位
   2. API 層級檢查：
      if not request.user.is_staff:
          return Response(status=403)

   【管理員審核頁面】
   RequestPanel 載入所有預約：
   1. 呼叫 GET /api/reservations/?view_all=true
   2. 後端檢查 user.is_staff && view_all=true
   3. 回傳所有使用者的預約（不限本人）
   4. 顯示清單：使用者、教室、日期、時段、狀態
   
   審核操作：
   1. 點擊「批准」或「拒絕」按鈕
   2. 呼叫 PATCH /api/reservations/{id}/status/
      body: { status: "approved" | "rejected" }
   3. 後端更新 reservation.status
   4. 前端更新列表（移除已處理項目）

   【後端審核邏輯】
   update_reservation_status 函數：
   
   1. 權限檢查：
      if not request.user.is_staff:
          return 403 "只有管理員可以審核"
   
   2. 預約存在性：
      Reservation.objects.get(pk=pk)
      不存在 → 404
   
   3. 狀態驗證：
      new_status in ['approved', 'rejected']
      無效 → 400
   
   4. 防止重複審核：
      if reservation.status in ['approved', 'rejected']:
          return 400 "此預約已經被審核過"
   
   5. 更新狀態：
      reservation.status = new_status
      reservation.save()
   
   6. 回傳更新後的資料（含 status_display 中文顯示）

   【資料查詢權限分離】
   get_queryset() 方法：
   - view_all=true + is_staff → 回傳所有預約（管理員審核用）
   - 預設 → 只回傳當前使用者的預約（個人歷史紀錄）

6. 預約歷史紀錄
   ------------
   
   【前端載入流程】
   HistoryPanel 組件：
   1. useEffect 監聽 showHistory 變化
   2. 只在 showHistory=true 時執行（避免無限循環）
   3. 呼叫 GET /api/reservations/ (不帶 view_all 參數)
   4. 後端自動只回傳該使用者的預約
   5. 儲存到 myReservations 狀態
   6. 渲染列表：
      - 教室 + 日期 + 時段
      - 狀態徽章（pending/approved/rejected）
      - 預約原因
      - 建立時間

   【狀態顯示轉換】
   const getStatusText = (status) => {
     pending: "待審核"
     approved: "已批准"
     rejected: "已拒絕"
     cancelled: "已取消"
   }

7. 效能優化實作
   ------------
   
   【後端優化】
   1. Redis 快取：
      @cache_page(60 * 15)  # 快取 15 分鐘
      def buildings(self, request):
          # 大樓列表不常變動，快取後減少資料庫查詢
   
   2. 資料庫查詢優化：
      # select_related：減少 N+1 查詢問題
      Reservation.objects.select_related("classroom", "user")
      
      # 索引：room_code 設為 unique，自動建立索引
      room_code = models.CharField(max_length=20, unique=True)
   
   3. 分頁機制：
      class ClassroomPagination(PageNumberPagination):
          page_size = 20          # 每頁 20 筆
          max_page_size = 100     # 最多 100 筆

   【前端優化】
   1. useMemo：避免不必要的重新計算
      const occSet = useMemo(() => 
        expandBlocks(occupied), 
        [occupied]
      );
   
   2. 防止無限循環（重要 Bug 修正）：
      useEffect(() => {
        if (!showHistory) return;  # 提早返回
        fetchMyReservations();
      }, [showHistory]);  # 只在真正需要時執行
   
   3. 預約成功後自動同步：
      // 預約成功後立即重新載入已預約時段
      await refreshOccupiedSlots();
      // 確保顯示最新狀態，包含其他使用者的預約


資料流向總覽
============

完整資料流程：
使用者操作 
  ↓
前端組件 (React)
  ↓
API 呼叫 (fetch + JWT Token)
  ↓
後端驗證 (Django DRF)
  ├─ 權限檢查 (IsAuthenticated / IsAdminUser)
  ├─ 資料驗證 (Serializer)
  └─ 業務邏輯 (perform_create / custom methods)
  ↓
資料庫操作 (MySQL via ORM)
  ├─ 查詢優化 (select_related)
  ├─ 快取檢查 (Redis)
  └─ 約束檢查 (unique_together)
  ↓
回傳 JSON
  ↓
前端更新狀態 (useState)
  ↓
UI 重新渲染

關鍵技術決策
============

1. 為何使用 JWT 而非 Session？
   - 前後端分離架構，RESTful API 設計
   - 無狀態 (Stateless)，易於水平擴展
   - 適合微服務架構

2. 為何需要 Token 自動刷新？
   - Access Token 短效期 (15分鐘) 提高安全性
   - Refresh Token 長效期 (1天) 減少重登次數
   - 自動刷新機制讓使用者無感

3. 為何使用 view_all 參數而非兩個 API？
   - 減少 API 端點數量
   - 共用相同的查詢邏輯
   - 權限控管更集中

4. 為何需要三層預約衝突檢測？
   - 前端：提升使用者體驗，即時回饋
   - 後端：確保業務邏輯正確性
   - 資料庫：確保資料一致性

5. 為何使用 Redis 快取大樓列表？
   - 大樓資料幾乎不變動
   - 高頻查詢（每次載入教室列表都需要）
   - 減少資料庫負擔，提升回應速度

