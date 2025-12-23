# 測試工具設置指南

## Vitest 前端測試框架

### 安裝依賴

```bash
npm install
```

### 運行測試

```bash
# 監視模式（開發時使用）
npm test

# 視覺化界面
npm run test:ui

# 測試覆蓋率報告
npm run test:coverage
```

### 測試文件位置

所有測試文件位於 `src/test/` 目錄：

- `api.test.js` - API 端點配置測試
- `dateValidation.test.js` - 日期驗證邏輯測試
- `useAuth.test.js` - 認證相關測試
- `reservations.test.js` - 預約邏輯測試
- `setup.js` - Vitest 配置文件

### 測試覆蓋範圍

✅ API 端點配置驗證
✅ 日期驗證邏輯
✅ Token 儲存和管理
✅ 預約時段衝突檢測
✅ 預約狀態轉換

---

## Postman API 測試

### 導入 Collection 和 Environment

1. 打開 Postman 應用
2. 點擊 `Import` 按鈕
3. 選擇 `Postman_Collection.json` 文件
4. 重複步驟 2-3，導入 `Postman_Environment.json`

### 配置環境變數

1. 點擊右上角環境下拉菜單
2. 選擇「Local Development」環境
3. 編輯以下變數：
   - `base_url`：http://127.0.0.1:8000（本地開發）
   - 或 https://ntou-classroom-booking.zeabur.app（生產環境）

### API 測試集合

#### 認證相關
- **Register** - 新使用者註冊
- **Login** - 使用者登入
- **Refresh Token** - 刷新過期的 Token

#### 教室查詢
- **Get Buildings** - 取得所有建築物
- **Get Classrooms by Building** - 取得特定建築的教室列表
- **Get Occupied Slots** - 查詢教室已預約的時段

#### 使用者預約
- **Create Reservation** - 建立新預約
- **Get My Reservations** - 查看個人預約歷史
- **Cancel Reservation** - 取消自己的預約

#### 管理員功能
- **Get All Reservations** - 查看所有預約（需管理員權限）
- **Approve Reservation** - 批准預約（需管理員權限）
- **Reject Reservation** - 拒絕預約（需管理員權限）

#### 黑名單管理
- **Check if Blacklisted** - 檢查使用者是否被黑名單
- **Get All Blacklisted Users** - 查看黑名單（需管理員權限）
- **Ban User** - 將使用者加入黑名單（需管理員權限）
- **Unban User** - 將使用者移出黑名單（需管理員權限）

### 快速測試流程

1. **登入測試**
   - 選擇「Login」請求
   - 填入測試帳號和密碼
   - 點擊「Send」

2. **複製 Token**
   - 登入成功後，從回應複製 access_token
   - 貼到環境變數中：`{{access_token}}`

3. **預約測試**
   - 選擇「Create Reservation」
   - 確認 Authorization header 包含 Bearer token
   - 點擊「Send」

4. **查看結果**
   - 檢查回應狀態碼（應為 201 Created）
   - 檢查回應 JSON 是否包含預約詳情

---

## 注意事項

### Vitest

- ✅ 無需啟動後端，純前端邏輯測試
- ✅ 自動監視檔案變化
- ✅ 支援 Coverage 報告
- ⚠️ Mock 對象不能測試真實 API 調用

### Postman

- ✅ 可測試真實 API
- ✅ 支援複雜的認證流程
- ✅ 可編寫前置和後置腳本
- ⚠️ 需要後端運行
- ⚠️ 無法自動化 CI/CD（需要付費版）

---

## 常見問題

**Q: 如何測試受保護的 API？**
A: 先執行 Login 請求，複製回應的 access_token，貼到環境變數中，其他請求會自動使用此 token。

**Q: reCAPTCHA 在本地測試時如何處理？**
A: 發送空的 recaptcha_token 或測試用 token。生產環境中 reCAPTCHA 需真實驗證。

**Q: 如何測試管理員功能？**
A: 使用管理員帳號登入，複製 token 到 admin_token 環境變數，使用相關請求測試。

---

**最後更新**: 2025/12/24
