# 教室查詢 API 文件

## 📋 API 端點總覽

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/rooms/classrooms/` | 取得教室列表（支援分頁、搜尋、排序） |
| GET | `/api/rooms/classrooms/{room_code}/` | 取得單一教室詳情 |
| GET | `/api/rooms/classrooms/buildings/` | 取得大樓列表 |
| GET | `/api/rooms/classrooms/stats/` | 取得統計資訊 |

---

## 🔍 1. 取得教室列表

**端點：** `GET /api/rooms/classrooms/`

### 查詢參數（Query Parameters）

| 參數 | 類型 | 說明 | 範例 |
|------|------|------|------|
| `building` | string | 按大樓過濾 | `?building=INS` |
| `search` | string | 關鍵字搜尋（教室代碼或名稱） | `?search=電腦` |
| `min_capacity` | integer | 最低容納人數 | `?min_capacity=40` |
| `has_projector` | boolean | 是否有投影機 | `?has_projector=true` |
| `has_whiteboard` | boolean | 是否有白板 | `?has_whiteboard=true` |
| `has_mic` | boolean | 是否有麥克風 | `?has_mic=true` |
| `page` | integer | 頁碼（預設 1） | `?page=2` |
| `page_size` | integer | 每頁筆數（預設 20，最大 100） | `?page_size=50` |
| `ordering` | string | 排序欄位 | `?ordering=-capacity` |

### 排序選項

- `capacity` - 按容納人數排序
- `-capacity` - 按容納人數反向排序
- `room_code` - 按教室代碼排序
- `building` - 按大樓排序

### 範例請求

```bash
# 取得所有教室
curl "http://127.0.0.1:8000/api/rooms/classrooms/"

# 搜尋資工系館的教室
curl "http://127.0.0.1:8000/api/rooms/classrooms/?building=INS"

# 搜尋有投影機且容納 40 人以上的教室
curl "http://127.0.0.1:8000/api/rooms/classrooms/?has_projector=true&min_capacity=40"

# 關鍵字搜尋「電腦」
curl "http://127.0.0.1:8000/api/rooms/classrooms/?search=電腦"

# 組合搜尋：資工系館、有投影機、按容納人數排序
curl "http://127.0.0.1:8000/api/rooms/classrooms/?building=INS&has_projector=true&ordering=-capacity"

# 分頁：取得第 2 頁，每頁 10 筆
curl "http://127.0.0.1:8000/api/rooms/classrooms/?page=2&page_size=10"
```

### 回應格式

```json
{
  "count": 13,
  "next": "http://127.0.0.1:8000/api/rooms/classrooms/?page=2",
  "previous": null,
  "results": [
    {
      "room_code": "INS201",
      "building": "INS",
      "building_name": "資工系館",
      "name": "資工系電腦教室",
      "capacity": 40,
      "room_type": "LAB",
      "room_type_name": "電腦教室",
      "has_projector": true,
      "has_whiteboard": true,
      "has_mic": false
    }
  ]
}
```

---

## 📍 2. 取得單一教室詳情

**端點：** `GET /api/rooms/classrooms/{room_code}/`

### 範例請求

```bash
curl "http://127.0.0.1:8000/api/rooms/classrooms/INS201/"
```

### 回應格式

```json
{
  "id": 1,
  "room_code": "INS201",
  "building": "INS",
  "building_name": "資工系館",
  "name": "資工系電腦教室",
  "capacity": 40,
  "room_type": "LAB",
  "has_projector": true,
  "has_whiteboard": true,
  "has_mic": false,
  "has_screen": false,
  "has_speaker": false,
  "has_teacher_computer": true,
  "student_computer_count": 40,
  "has_air_conditioner": true,
  "has_fan": false,
  "power_socket_count": 0,
  "wheelchair_accessible": false,
  "equipment_note": "",
  "is_active": true
}
```

---

## 🏢 3. 取得大樓列表

**端點：** `GET /api/rooms/classrooms/buildings/`

### 範例請求

```bash
curl "http://127.0.0.1:8000/api/rooms/classrooms/buildings/"
```

### 回應格式

```json
[
  {
    "code": "INS",
    "name": "資工系館",
    "classroom_count": 4
  },
  {
    "code": "ECG",
    "name": "電資暨綜合教學大樓",
    "classroom_count": 3
  }
]
```

**快取：** 此端點有 15 分鐘快取

---

## 📊 4. 取得統計資訊

**端點：** `GET /api/rooms/classrooms/stats/`

### 範例請求

```bash
curl "http://127.0.0.1:8000/api/rooms/classrooms/stats/"
```

### 回應格式

```json
{
  "total_classrooms": 13,
  "total_capacity": 600,
  "avg_capacity": 46,
  "buildings_count": 5,
  "equipment_stats": {
    "has_projector": 10,
    "has_whiteboard": 12,
    "has_mic": 5
  }
}
```

---

## ⚡ 效能優化重點

### 1. **分頁**
- 預設每頁 20 筆，減少資料傳輸量
- 可自訂每頁筆數（最大 100）

### 2. **快取**
- 大樓列表快取 15 分鐘
- 統計資訊可考慮加快取（視需求）

### 3. **查詢優化**
- buildings 端點從 N 次查詢優化為 1 次
- 使用資料庫 aggregation 減少查詢次數

### 4. **簡化 Serializer**
- 列表使用 `ClassroomListSerializer`（只回傳必要欄位）
- 詳情使用 `ClassroomSerializer`（完整資訊）

---

## 🔧 前端整合範例

### JavaScript/React 範例

```javascript
// 取得大樓列表
const fetchBuildings = async () => {
  const res = await fetch('http://127.0.0.1:8000/api/rooms/classrooms/buildings/');
  const buildings = await res.json();
  return buildings;
};

// 進階搜尋教室
const searchClassrooms = async (filters) => {
  const params = new URLSearchParams();
  
  if (filters.building) params.append('building', filters.building);
  if (filters.search) params.append('search', filters.search);
  if (filters.minCapacity) params.append('min_capacity', filters.minCapacity);
  if (filters.hasProjector) params.append('has_projector', 'true');
  if (filters.hasWhiteboard) params.append('has_whiteboard', 'true');
  if (filters.hasMic) params.append('has_mic', 'true');
  
  const res = await fetch(`http://127.0.0.1:8000/api/rooms/classrooms/?${params}`);
  const data = await res.json();
  return data;
};

// 使用範例
const classrooms = await searchClassrooms({
  building: 'INS',
  hasProjector: true,
  minCapacity: 40
});
```

---

## 📝 注意事項

1. **權限：** 目前所有端點都是 `AllowAny`，任何人都可以查詢
2. **CORS：** 確保前端域名已加入 `CORS_ALLOWED_ORIGINS`
3. **大樓代碼：** 前後端已統一使用 `INS`, `ECG`, `LIB`, `GH1`, `GH2`
4. **布林值：** 查詢參數使用 `true`/`false`（小寫）

---

## 🐛 錯誤處理

### 404 - 教室不存在

```json
{
  "detail": "未找到。"
}
```

### 400 - 參數錯誤

```json
{
  "detail": "無效的參數"
}
```
