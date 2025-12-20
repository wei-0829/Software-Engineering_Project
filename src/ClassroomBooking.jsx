// ClassroomBooking.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./ClassroomBooking.css";
import { API_ENDPOINTS } from "./config/api.js";
import { useAuth } from "./useAuth";

const WEEK_DAYS = ["一", "二", "三", "四", "五", "六", "日"];
const START_HOUR = 8;
const END_HOUR = 21;

// 把 JS Date 轉成「YYYY-MM-DD」（用本地時間，不用 UTC）
function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 輔助函數：取得本週的週一（目前沒有用到，保留）
function getWeekStart() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// 輔助函數：取得本週的週日（目前沒有用到，保留）
function getWeekEnd() {
  const monday = getWeekStart();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

// 保留舊的 ROOM_META 作為備用（未來可移除）
const ROOM_META = {
  INS201: { name: "資工系電腦教室", capacity: 40, projector: true, whiteboard: true, network: true, mic: false },
  INS202: { name: "資工系普通教室", capacity: 30, projector: true, whiteboard: true, network: true, mic: false },
  INS301: { name: "專題討論室", capacity: 20, projector: false, whiteboard: true, network: true, mic: false },
  INS302: { name: "會議教室", capacity: 25, projector: true, whiteboard: true, network: true, mic: true },
  ECG301: { name: "電資大樓電腦教室", capacity: 60, projector: true, whiteboard: true, network: true, mic: true },
  ECG302: { name: "電資大樓普通教室", capacity: 50, projector: true, whiteboard: true, network: true, mic: false },
  ECG310: { name: "視聽教室", capacity: 80, projector: true, whiteboard: false, network: true, mic: true },
  LIB410: { name: "圖書館研討室 A", capacity: 12, projector: false, whiteboard: true, network: true, mic: false },
  LIB411: { name: "圖書館研討室 B", capacity: 16, projector: false, whiteboard: true, network: true, mic: false },
  GH101: { name: "綜一普通教室 101", capacity: 45, projector: true, whiteboard: true, network: true, mic: false },
  GH102: { name: "綜一普通教室 102", capacity: 45, projector: true, whiteboard: true, network: true, mic: false },
  GH201: { name: "綜二講堂 201", capacity: 120, projector: true, whiteboard: true, network: true, mic: true },
  GH202: { name: "綜二普通教室 202", capacity: 60, projector: true, whiteboard: true, network: true, mic: false },
};

function expandBlocks(blocks) {
  const set = new Set();
  blocks.forEach(({ day, start, end }) => {
    for (let h = start; h < end; h++) set.add(`${day}-${h}`);
  });
  return set;
}

/** 日期＋時間版日曆 */
function DateTimeCalendar({ room, occupied, onReserve }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [purpose, setPurpose] = useState("");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);

  const isSameDate = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isBefore = (a, b) => a.getTime() < b.getTime();
  const isAfter = (a, b) => a.getTime() > b.getTime();

  const calendarDays = useMemo(() => {
    const days = [];
    const firstOfMonth = new Date(currentMonth);
    const start = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - firstOfMonth.getDay());
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  const canGoPrev = useMemo(() => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    prevMonth.setDate(1);
    prevMonth.setHours(0, 0, 0, 0);

    const endPrev = new Date(prevMonth);
    endPrev.setMonth(endPrev.getMonth() + 1);
    endPrev.setDate(0);
    endPrev.setHours(0, 0, 0, 0);

    return !isBefore(endPrev, today);
  }, [currentMonth, today]);

  const canGoNext = useMemo(() => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return !isAfter(nextMonth, maxDate);
  }, [currentMonth, maxDate]);

  const handleChangeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    newMonth.setDate(1);
    newMonth.setHours(0, 0, 0, 0);

    const monthStart = newMonth;
    const monthEnd = new Date(newMonth);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(0, 0, 0, 0);

    if (isAfter(monthStart, maxDate) || isBefore(monthEnd, today)) return;
    setCurrentMonth(newMonth);
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      slots.push({ label: `${h}:00–${h + 1}:00`, start: h, end: h + 1 });
    }
    return slots;
  }, []);

  const occupiedSet = useMemo(() => {
    if (!selectedDate || !occupied) return new Set();
    const dateStr = formatDateLocal(selectedDate);
    const blocks = occupied[dateStr] || [];
    const set = new Set();
    blocks.forEach((block) => {
      for (let h = block.start; h < block.end; h++) set.add(h);
    });
    return set;
  }, [selectedDate, occupied]);

  const handleSelectDate = (day) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    if (isBefore(d, today) || isAfter(d, maxDate)) return;
    setSelectedDate(d);
    setSelectedTime("");
  };

  const handleReserveClick = () => {
    if (!room || !selectedDate || !selectedTime) return;
    const slot = timeSlots.find((t) => t.label === selectedTime);
    if (!slot) return;

    onReserve?.({
      room,
      date: formatDateLocal(selectedDate),
      start: slot.start,
      end: slot.end,
      reason: purpose.trim(),
    });
  };

  const formatMonthTitle = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月`;
  const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];

  const formatDateLong = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const w = weekdayNames[d.getDay()];
    return `${y}-${m}-${day}（週${w}）`;
  };

  return (
    <div className="cal-wrap">
      <div className="cal-left">
        <div className="cal-title">選擇日期</div>

        <div className="cal-month-header">
          <button type="button" className="cal-nav-btn" onClick={() => handleChangeMonth(-1)} disabled={!canGoPrev}>
            ‹
          </button>
          <div className="cal-month-title">{formatMonthTitle(currentMonth)}</div>
          <button type="button" className="cal-nav-btn" onClick={() => handleChangeMonth(1)} disabled={!canGoNext}>
            ›
          </button>
        </div>

        <div className="cal-week-row">
          {weekdayNames.map((w) => (
            <div key={w} className="cal-weekday">
              {w}
            </div>
          ))}
        </div>

        <div className="cal-date-grid">
          {calendarDays.map((d) => {
            const isOtherMonth = d.getMonth() !== currentMonth.getMonth();
            const disabled = isBefore(d, today) || isAfter(d, maxDate);
            const isSelected = selectedDate && isSameDate(selectedDate, d);
            const isToday = isSameDate(d, today);

            let cls = "cal-date-cell";
            if (isOtherMonth) cls += " is-other-month";
            if (disabled) cls += " is-disabled";
            if (isToday) cls += " is-today";
            if (isSelected) cls += " is-selected";

            return (
              <button
                type="button"
                key={d.toISOString()}
                className={cls}
                onClick={() => handleSelectDate(d)}
                disabled={disabled}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cal-right">
        <div className="cal-title">選擇時間</div>
        <select className="cal-time-select" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
          <option value="">請選擇時段</option>
          {timeSlots.map((slot) => (
            <option key={slot.label} value={slot.label} disabled={occupiedSet.has(slot.start)}>
              {slot.label}
              {occupiedSet.has(slot.start) ? "（已被預約）" : ""}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 12 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "#4b5563",
              marginBottom: 6,
            }}
          >
            借用用途說明
          </label>

          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="請簡要說明本次借用用途（例如：課程教學、專題討論、系學會活動…）"
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 14,
              resize: "none",
            }}
          />
        </div>

        <div className="wk-actions" style={{ marginTop: 16 }}>
          <button className="cb-btn" disabled={!selectedDate || !selectedTime} onClick={handleReserveClick}>
            {selectedDate && selectedTime ? `預約：${room}｜${formatDateLong(selectedDate)}｜${selectedTime}` : "請先選擇日期與時間"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassroomBooking() {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const [buildingSearch, setBuildingSearch] = useState("");

  const [keyword, setKeyword] = useState("");
  const [minCapacity, setMinCapacity] = useState("");

  const [needProjector, setNeedProjector] = useState(false);
  const [needWhiteboard, setNeedWhiteboard] = useState(false);
  const [needNetwork, setNeedNetwork] = useState(false);
  const [needMic, setNeedMic] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  // ✅ 新增：避免「空資料一直顯示載入中 / 或載入前先顯示空狀態」
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // ✅ 快取 + 預載
  const [allReservations, setAllReservations] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  const inFlight = useRef({ my: false, all: false });
  const cacheTs = useRef({ my: 0, all: 0 });
  const CACHE_TTL = 60 * 1000;

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("reservation_history");
    return saved ? JSON.parse(saved) : [];
  });

  const { account, user, isAdmin, logout, refreshAccessToken } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const [occupiedMap, setOccupiedMap] = useState({});

  useEffect(() => {
    localStorage.setItem("reservation_history", JSON.stringify(history));
  }, [history]);

  // ✅ 統一把 API 回傳轉成「陣列」
  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  };

  // ✅ 統一帶 auth 的 fetch（含 token refresh）
  const fetchWithAuth = async (url, options = {}) => {
    let token = localStorage.getItem("access_token");
    if (!token) throw new Error("no_token");

    const doReq = (t) =>
      fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${t}`,
        },
      });

    let res = await doReq(token);

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error("auth_expired");
      res = await doReq(newToken);
    }

    return res;
  };

  // ✅ 載入「我的預約」（空資料也快取，避免一直載入）
  const loadMyReservations = async ({ force = false } = {}) => {
    if (!account) return;
    if (inFlight.current.my) return;

    const now = Date.now();
    if (!force && now - cacheTs.current.my < CACHE_TTL) return;

    inFlight.current.my = true;
    setLoadingMy(true);

    try {
      const url = `${API_ENDPOINTS.reservations()}?limit=200`;
      const res = await fetchWithAuth(url);

      if (!res.ok) throw new Error("load_my_failed");
      const data = await res.json();

      setMyReservations(normalizeList(data));
      cacheTs.current.my = Date.now();
    } catch (e) {
      console.error("loadMyReservations failed:", e);
      if (String(e?.message) === "auth_expired") logout();

      setMyReservations([]);
      cacheTs.current.my = Date.now();
    } finally {
      setLoadingMy(false);
      inFlight.current.my = false;
    }
  };

  // ✅ 載入「全部預約」（管理員）（空資料也快取）
  const loadAllReservations = async ({ force = false } = {}) => {
    if (!isAdmin) return;
    if (inFlight.current.all) return;

    const now = Date.now();
    if (!force && now - cacheTs.current.all < CACHE_TTL) return;

    inFlight.current.all = true;
    setLoadingAll(true);

    try {
      const url = `${API_ENDPOINTS.reservations()}?view_all=true&status=pending&limit=200`;
      const res = await fetchWithAuth(url);

      if (!res.ok) throw new Error("load_all_failed");
      const data = await res.json();

      setAllReservations(normalizeList(data));
      cacheTs.current.all = Date.now();
    } catch (e) {
      console.error("loadAllReservations failed:", e);
      if (String(e?.message) === "auth_expired") logout();

      setAllReservations([]);
      cacheTs.current.all = Date.now();
    } finally {
      setLoadingAll(false);
      inFlight.current.all = false;
    }
  };

  // ✅ 進主頁先預載
  useEffect(() => {
    if (!account) return;
    loadMyReservations();
    if (isAdmin) loadAllReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, isAdmin]);

  // ✅ 載入大樓列表（加入 loadingBuildings）
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        setLoadingBuildings(true);
        const res = await fetch(API_ENDPOINTS.buildings());
        if (!res.ok) throw new Error("載入大樓列表失敗");
        const data = await res.json();
        setBuildings(data);
      } catch (error) {
        console.error("載入大樓列表失敗:", error);
        alert("載入大樓列表失敗");
        setBuildings([]);
      } finally {
        setLoadingBuildings(false);
      }
    };
    fetchBuildings();
  }, []);

  // ✅ 載入教室列表（根據搜尋條件）（加入 loadingRooms + 防止舊請求覆蓋）
  useEffect(() => {
    if (!selectedBuilding) {
      setClassrooms([]);
      return;
    }

    let alive = true;

    const fetchClassrooms = async () => {
      try {
        setLoadingRooms(true);

        const params = new URLSearchParams({ building: selectedBuilding.code });

        if (keyword) params.append("search", keyword);
        if (minCapacity) params.append("min_capacity", minCapacity);
        if (needProjector) params.append("has_projector", "true");
        if (needWhiteboard) params.append("has_whiteboard", "true");
        if (needNetwork) params.append("has_network", "true");
        if (needMic) params.append("has_mic", "true");

        const res = await fetch(API_ENDPOINTS.classrooms(params.toString()));
        if (!res.ok) throw new Error("載入教室列表失敗");
        const data = await res.json();

        if (!alive) return;

        setClassrooms(data.results || data);
        setSelectedRoom(null);
      } catch (error) {
        console.error("載入教室列表失敗:", error);
        alert("載入教室列表失敗");
        if (!alive) return;
        setClassrooms([]);
      } finally {
        if (alive) setLoadingRooms(false);
      }
    };

    fetchClassrooms();

    return () => {
      alive = false;
    };
  }, [selectedBuilding, keyword, minCapacity, needProjector, needWhiteboard, needNetwork, needMic]);

  // 載入已預約時段（未來半年）
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchOccupiedSlots = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 6);

        const params = new URLSearchParams({
          classroom: selectedRoom,
          date_from: formatDateLocal(today),
          date_to: formatDateLocal(endDate),
        });

        const res = await fetch(API_ENDPOINTS.occupiedSlots(params.toString()));
        if (!res.ok) throw new Error("載入預約時段失敗");
        const data = await res.json();

        const byDate = {};
        data.forEach((slot) => {
          const dateStr = slot.date;
          const [start, end] = slot.time_slot.split("-").map(Number);
          if (!byDate[dateStr]) byDate[dateStr] = [];
          byDate[dateStr].push({ start, end });
        });

        setOccupiedMap((prev) => ({ ...prev, [selectedRoom]: byDate }));
      } catch (error) {
        console.error("載入預約時段失敗:", error);
      }
    };

    fetchOccupiedSlots();
  }, [selectedRoom]);

  const filteredBuildings = useMemo(() => {
    const kw = buildingSearch.trim().toLowerCase();
    if (!kw) return buildings;
    return buildings.filter((b) => b.name.toLowerCase().includes(kw) || b.code.toLowerCase().includes(kw));
  }, [buildingSearch, buildings]);

  const resetFilters = () => {
    setKeyword("");
    setMinCapacity("");
    setNeedProjector(false);
    setNeedWhiteboard(false);
    setNeedNetwork(false);
    setNeedMic(false);
    setSelectedRoom(null);
  };

  const handleBackToBooking = () => {
    setShowHistory(false);
    setShowRequests(false);
  };

  const handleLogout = () => {
    logout();
    setHistory([]);
    setShowHistory(false);
    setShowRequests(false);
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setClassrooms([]);

    // ✅ 登出後跳提示
    alert("已成功登出");

    // ✅（可選）導回登入頁，避免留在同頁誤操作
    navigate("/login");
  };

  const filteredRooms = useMemo(() => classrooms, [classrooms]);

  const resetSelection = () => {
    setSelectedBuilding(null);
    resetFilters();
  };

  /** 預約事件：打後端 /api/reservations/ */
  const handleReserve = async ({ room, date, start, end, reason }) => {
    let token = localStorage.getItem("access_token");
    if (!token) {
      alert("請先登入後再預約");
      navigate("/login");
      return;
    }

    const dateString = date;

    const payload = {
      classroom: room,
      date: dateString,
      time_slot: `${start}-${end}`,
      reason: reason || "",
    };

    const makeRequest = async (accessToken) =>
      fetch(API_ENDPOINTS.reservations(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

    try {
      let res = await makeRequest(token);
      let data = await res.json().catch(() => ({}));

      if (res.status === 401 && data.code === "token_not_valid") {
        const newToken = await refreshAccessToken();
        if (newToken) {
          token = newToken;
          res = await makeRequest(token);
          data = await res.json().catch(() => ({}));
        } else {
          alert("登入已過期，請重新登入");
          logout();
          navigate("/login");
          return;
        }
      }

      if (!res.ok) {
        if (data.detail) alert("預約失敗：" + data.detail);
        else alert("預約失敗：" + JSON.stringify(data));
        return;
      }

      const refreshOccupiedSlots = async () => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = new Date(today);
          endDate.setMonth(endDate.getMonth() + 6);

          const params = new URLSearchParams({
            classroom: room,
            date_from: formatDateLocal(today),
            date_to: formatDateLocal(endDate),
          });

          const res2 = await fetch(API_ENDPOINTS.occupiedSlots(params.toString()));
          if (!res2.ok) throw new Error("載入預約時段失敗");

          const data2 = await res2.json();
          const byDate = {};

          data2.forEach((slot) => {
            const dateStr = slot.date;
            const [s, e] = slot.time_slot.split("-").map(Number);
            if (!byDate[dateStr]) byDate[dateStr] = [];
            byDate[dateStr].push({ start: s, end: e });
          });

          setOccupiedMap((prev) => ({ ...prev, [room]: byDate }));
        } catch (error) {
          console.error("載入預約時段失敗:", error);
        }
      };

      const dObj = new Date(dateString);
      const jsDay = dObj.getDay();
      const dayIndex = ((jsDay + 6) % 7) + 1;
      const weekName = WEEK_DAYS[dayIndex - 1];

      setHistory((old) => [
        ...old,
        {
          ts: new Date().toISOString(),
          buildingName: selectedBuilding?.name || "",
          buildingCode: selectedBuilding?.code || "",
          room,
          day: dayIndex,
          start,
          end,
          status: data.status || "pending",
          date: dateString,
          reason: reason || "",
        },
      ]);

      alert(`預約成功：${room}｜${dateString}（週${weekName}） ${start}:00–${end}:00`);

      await refreshOccupiedSlots();

      loadMyReservations({ force: true });
      if (isAdmin) loadAllReservations({ force: true });
    } catch (err) {
      console.error(err);
      alert("預約失敗：無法連線到伺服器");
    }
  };

  const handleCancelReservation = async (reservation) => {
    const { classroom, date, time_slot } = reservation;

    if (!window.confirm(`確定要取消 ${classroom} ${date} ${time_slot} 的預約嗎？`)) return;

    try {
      let token = localStorage.getItem("access_token");

      const doRequest = async (accessToken) =>
        fetch(API_ENDPOINTS.cancelReservation(reservation.id), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

      let res = await doRequest(token);

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          alert("登入已過期，請重新登入");
          logout();
          return;
        }
        res = await doRequest(newToken);
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("取消預約失敗：", res.status, errBody);
        throw new Error(errBody.detail || errBody.error || "取消預約失敗");
      }

      setMyReservations((prev) => prev.map((r) => (r.id === reservation.id ? { ...r, status: "cancelled" } : r)));

      alert("預約已成功取消");

      loadMyReservations({ force: true });
      if (isAdmin) loadAllReservations({ force: true });
    } catch (error) {
      console.error("取消預約失敗:", error);
      alert(error.message || "取消預約失敗");
    }
  };

  /** 歷史頁（用 myReservations，支援取消） */
  const HistoryPanel = () => {
    useEffect(() => {
      if (!showHistory) return;
      loadMyReservations();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showHistory]);

    if (loadingMy) {
      return (
        <div className="cb-section">
          <h2 className="cb-section-title">我的教室預約歷史</h2>
          <div className="cb-selection-banner">載入中…</div>
        </div>
      );
    }

    const hasServerHistory = Array.isArray(myReservations) && myReservations.length > 0;
    const hasLocalHistory = Array.isArray(history) && history.length > 0;
    const hasHistory = hasServerHistory || hasLocalHistory;

    const getStatusLabel = (status, item) => {
      switch (status) {
        case "approved":
          return "已批准";
        case "rejected":
          return item?._cancelledByUser ? "已取消" : "已拒絕";
        case "cancelled":
          return "已取消";
        case "pending":
        default:
          return "待審核";
      }
    };

    const getStatusStyle = (status, item) => {
      switch (status) {
        case "approved":
          return { color: "#1d4ed8", fontWeight: 600 };
        case "rejected":
          return item?._cancelledByUser ? { color: "#6b7280", fontWeight: 600 } : { color: "#dc2626", fontWeight: 600 };
        case "cancelled":
          return { color: "#6b7280", fontWeight: 600 };
        case "pending":
        default:
          return { color: "#111827", fontWeight: 600 };
      }
    };

    if (!hasHistory) {
      return (
        <div className="cb-section">
          <h2 className="cb-section-title">我的教室預約歷史</h2>
          <div className="cb-selection-banner">目前沒有任何預約紀錄。</div>
        </div>
      );
    }

    const rawList = hasServerHistory ? myReservations : history;

    const list = [...rawList].sort((a, b) => {
      const getTime = (x) => {
        const t = x.created_at || x.ts || x.date;
        return t ? new Date(t).getTime() : 0;
      };
      return getTime(b) - getTime(a);
    });

    return (
      <div className="cb-section">
        <h2 className="cb-section-title">我的教室預約歷史</h2>
        <ol className="cb-list dashed cb-history-list">
          {list.map((item, idx) => {
            const fromServer = item && typeof item === "object" && "classroom" in item;

            const room = fromServer ? item.classroom : item.room;
            const date = item.date;
            const status = item.status || "pending";

            const timeLabel = fromServer ? item.time_slot : `${item.start}:00–${item.end}:00`;

            const canCancel = fromServer && status !== "rejected" && status !== "cancelled";

            const submittedAt = item.created_at ? new Date(item.created_at) : item.ts ? new Date(item.ts) : null;

            const purpose = item.purpose || item.reason || item.usage || item.apply_reason || "無";

            return (
              <li key={(item.id || item.ts || idx) + "-" + idx} className="cb-history-item">
                <div className="cb-history-main">
                  <div style={{ fontWeight: 800 }}>教室：{room}</div>
                  <div>
                    日期：{date} | 時段：{timeLabel}
                  </div>

                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>申請用途：{purpose}</div>

                  {submittedAt && (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      送出時間：{submittedAt.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="cb-history-status">
                  <span style={getStatusStyle(status, item)}>{getStatusLabel(status, item)}</span>

                  {canCancel && (
                    <button
                      className="cb-btn"
                      style={{ marginLeft: 8, padding: "4px 10px" }}
                      onClick={() => handleCancelReservation(item)}
                    >
                      取消預約
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  /** 管理員租借請求審核頁 */
  const RequestPanel = () => {
    useEffect(() => {
      if (!isAdmin || !showRequests) return;
      loadAllReservations();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, showRequests]);

    const handleReviewReservation = async (reservationId, newStatus) => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(API_ENDPOINTS.updateReservationStatus(reservationId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.status === 401) {
          await refreshAccessToken();
          return;
        }
        if (!res.ok) throw new Error("更新預約狀態失敗");

        setAllReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: newStatus } : r)));
        setMyReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, status: newStatus } : r)));

        alert(`預約已${newStatus === "approved" ? "批准" : "拒絕"}`);
      } catch (error) {
        console.error("更新預約狀態失敗:", error);
        alert("更新預約狀態失敗");
      }
    };

    const pendingReservations = useMemo(() => {
      return (Array.isArray(allReservations) ? allReservations : [])
        .filter((r) => r.status === "pending")
        .slice()
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
    }, [allReservations]);

    return (
      <div className="cb-section">
        <h2 className="cb-section-title">目前租借請求管理</h2>

        {loadingAll ? (
          <div className="cb-selection-banner">載入中…</div>
        ) : pendingReservations.length === 0 ? (
          <div className="cb-selection-banner">目前沒有任何待處理的請求。</div>
        ) : (
          <ol className="cb-list dashed">
            {pendingReservations.map((reservation) => (
              <li key={reservation.id}>
                <div style={{ fontWeight: 800 }}>教室：{reservation.classroom}</div>
                <div>
                  申請人：{reservation.user_email || "未知"}
                  {reservation.user_name && ` (${reservation.user_name})`}
                </div>
                <div>
                  日期：{reservation.date} | 時段：{reservation.time_slot}
                </div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>申請用途：{reservation.reason || "無"}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  送出時間：{reservation.created_at && new Date(reservation.created_at).toLocaleString()}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button className="cb-btn" onClick={() => handleReviewReservation(reservation.id, "approved")}>
                    批准
                  </button>
                  <button
                    className="cb-btn"
                    style={{ background: "#d32f2f" }}
                    onClick={() => handleReviewReservation(reservation.id, "rejected")}
                  >
                    拒絕
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  };

  const selectedRoomMeta = useMemo(() => {
    if (!selectedRoom) return null;
    return classrooms.find((c) => c.room_code === selectedRoom);
  }, [selectedRoom, classrooms]);

  return (
    <div className="cb-root">
      <aside className="cb-sidebar">
        <div className="cb-brand">
          <div className="cb-brand-top">
            <div className="cb-logo" />
            <div>
              <div className="cb-brand-name">國立臺灣海洋大學</div>
              <div className="cb-brand-sub">海大教室預約系統</div>
            </div>
          </div>

          <div className="cb-breadcrumb">
            <button className="cb-crumb" disabled={!selectedBuilding} onClick={resetSelection}>
              大樓
            </button>
            {selectedBuilding && (
              <>
                <span className="cb-crumb-sep">/</span>
                <span className="cb-crumb active">
                  {selectedBuilding.name}（{selectedBuilding.code}）
                </span>
              </>
            )}
          </div>

          <div className="cb-search">
            <input
              className="cb-search-input"
              placeholder="搜尋大樓名稱或代碼…"
              value={buildingSearch}
              onChange={(e) => setBuildingSearch(e.target.value)}
            />
            {buildingSearch && (
              <button className="cb-search-clear" onClick={() => setBuildingSearch("")} aria-label="清除大樓搜尋">
                ×
              </button>
            )}
          </div>
        </div>

        <ul className="cb-tree">
          {loadingBuildings ? (
            <li className="cb-tree-empty">載入中…</li>
          ) : filteredBuildings.length === 0 ? (
            <li className="cb-tree-empty">找不到符合的教學大樓。</li>
          ) : (
            filteredBuildings.map((b) => (
              <li
                key={b.code}
                className="cb-tree-item cb-tree-building"
                onClick={() => {
                  setShowHistory(false);
                  setShowRequests(false);
                  setSelectedBuilding(b);
                  resetFilters();
                }}
              >
                <span className="cb-building-code">{b.code}</span>
                <span className="cb-building-name">{b.name}</span>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="cb-main">
        <div className="cb-hero">
          <div className="cb-hero-actions">
            {(showHistory || showRequests) && (
              <button className="cb-login-btn" onClick={handleBackToBooking}>
                返回預約
              </button>
            )}

            {account ? (
              <div className="cb-menu">
                <button
                  className="cb-login-btn"
                  onClick={() => {
                    setShowUserMenu((v) => !v);
                    setShowAdminMenu(false);
                  }}
                >
                  {user} ▾
                </button>

                {showUserMenu && (
                  <div className="cb-menu-panel">
                    <button
                      className="cb-menu-item"
                      onClick={() => {
                        setShowHistory((v) => !v);
                        setShowRequests(false);
                        setShowUserMenu(false);
                      }}
                    >
                      歷史紀錄
                    </button>

                    <button
                      className="cb-menu-item"
                      onClick={() => {
                        navigate("/profile");
                        setShowUserMenu(false);
                      }}
                    >
                      修改個人資料
                    </button>

                    <div className="cb-menu-divider" />

                    <button className="cb-menu-item danger" onClick={handleLogout}>
                      登出
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="cb-login-btn" onClick={() => navigate("/login")}>
                登入
              </button>
            )}

            {isAdmin && (
              <div className="cb-menu">
                <button
                  className="cb-login-btn"
                  onClick={() => {
                    setShowAdminMenu((v) => !v);
                    setShowUserMenu(false);
                  }}
                >
                  管理員功能 ▾
                </button>

                {showAdminMenu && (
                  <div className="cb-menu-panel">
                    <button
                      className="cb-menu-item"
                      onClick={() => {
                        setShowRequests((v) => !v);
                        setShowHistory(false);
                        setShowAdminMenu(false);
                      }}
                    >
                      確認租借
                    </button>

                    <button
                      className="cb-menu-item"
                      onClick={() => {
                        navigate("/editing-classroom");
                        setShowAdminMenu(false);
                      }}
                    >
                      編輯教室
                    </button>

                    <button
                      className="cb-menu-item"
                      onClick={() => {
                        navigate("/blacklist");
                        setShowAdminMenu(false);
                      }}
                    >
                      黑名單
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="cb-card">
          <h1 className="cb-card-title">
            {showRequests
              ? "租借請求管理"
              : showHistory
              ? "教室預約歷史"
              : selectedBuilding
              ? "選擇教室與進階搜尋"
              : "教室預約系統說明"}
          </h1>

          {showRequests ? (
            <RequestPanel />
          ) : showHistory ? (
            <HistoryPanel />
          ) : selectedBuilding ? (
            <>
              <div className="cb-selection-banner">
                目前選擇：{selectedBuilding.name}（{selectedBuilding.code}）
              </div>

              <div className="cb-section">
                <h2 className="cb-section-title">進階搜尋</h2>
                <div className="cb-filter-bar">
                  <div className="cb-filter-group">
                    <label className="cb-filter-label">關鍵字</label>
                    <input
                      className="cb-search-input"
                      placeholder="例如：201、電腦教室、視聽…"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </div>

                  <div className="cb-filter-group">
                    <label className="cb-filter-label">最低容納人數</label>
                    <select className="cb-search-input" value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)}>
                      <option value="">不限</option>
                      <option value="20">20 人以上</option>
                      <option value="40">40 人以上</option>
                      <option value="60">60 人以上</option>
                      <option value="80">80 人以上</option>
                      <option value="100">100 人以上</option>
                    </select>
                  </div>

                  <div className="cb-filter-group cb-filter-checks">
                    <label className="cb-filter-check">
                      <input type="checkbox" checked={needProjector} onChange={(e) => setNeedProjector(e.target.checked)} />
                      有投影機
                    </label>

                    <label className="cb-filter-check">
                      <input type="checkbox" checked={needWhiteboard} onChange={(e) => setNeedWhiteboard(e.target.checked)} />
                      有白板
                    </label>

                    <label className="cb-filter-check">
                      <input type="checkbox" checked={needNetwork} onChange={(e) => setNeedNetwork(e.target.checked)} />
                      有網路
                    </label>

                    <label className="cb-filter-check">
                      <input type="checkbox" checked={needMic} onChange={(e) => setNeedMic(e.target.checked)} />
                      有麥克風
                    </label>
                  </div>

                  <button className="cb-btn" type="button" onClick={resetFilters}>
                    清除條件
                  </button>
                </div>
              </div>

              <div className="cb-divider" />

              <div className="cb-section">
                <h2 className="cb-section-title">可借用教室</h2>

                {loadingRooms ? (
                  <div className="cb-selection-banner">載入中…</div>
                ) : filteredRooms.length === 0 ? (
                  <div className="cb-selection-banner">找不到符合條件的教室，請調整搜尋條件。</div>
                ) : (
                  <div className="cb-room-grid">
                    {filteredRooms.map((classroom) => {
                      const active = selectedRoom === classroom.room_code;

                      return (
                        <div
                          key={classroom.room_code}
                          className={"cb-room-card" + (active ? " cb-room-card-active" : "")}
                          onClick={() => setSelectedRoom(classroom.room_code)}
                        >
                          <div className="cb-room-code">{classroom.room_code}</div>
                          <div className="cb-room-name">{classroom.name || "教室"}</div>
                          <div className="cb-room-capacity">容納人數：約 {classroom.capacity || "—"} 人</div>
                          <div className="cb-room-tags">
                            {classroom.has_projector && <span className="cb-tag">投影機</span>}
                            {classroom.has_whiteboard && <span className="cb-tag">白板</span>}
                            {classroom.has_mic && <span className="cb-tag">麥克風</span>}
                            {classroom.has_network && <span className="cb-tag">網路</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedRoom && (
                <>
                  <div className="cb-divider" />
                  <div className="cb-section">
                    <h2 className="cb-section-title">預約時段</h2>
                    <div className="wk-room-banner">
                      目前教室：{selectedRoom}
                      {selectedRoomMeta?.name ? `｜${selectedRoomMeta.name}` : ""}
                    </div>
                    <DateTimeCalendar room={selectedRoom} occupied={occupiedMap[selectedRoom] || {}} onReserve={handleReserve} />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="cb-section">
                <h2 className="cb-section-title">注意事項</h2>
                <ol className="cb-list dashed">
                  <li>僅限本校教職員與在校學生登入並借用。</li>
                  <li>借用人需自行負責設備保管與歸還狀況。</li>
                  <li>借用後須保持教室整潔、恢復原狀。</li>
                </ol>
              </div>
              <div className="cb-divider" />
              <div className="cb-section">
                <h2 className="cb-section-title">借用流程</h2>
                <ol className="cb-list dashed">
                  <li>登入系統。</li>
                  <li>從左側選擇大樓。</li>
                  <li>在右側進階搜尋條選擇條件與教室。</li>
                  <li>點選下方時段及填寫用途說明並提出租借。</li>
                  <li>等待管理員確認。</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
