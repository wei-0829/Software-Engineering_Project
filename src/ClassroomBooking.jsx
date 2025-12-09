// ClassroomBooking.jsx
import { useMemo, useState, useEffect } from "react";
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
  INS201: {
    name: "資工系電腦教室",
    capacity: 40,
    projector: true,
    whiteboard: true,
    network: true,
    mic: false,
  },
  INS202: {
    name: "資工系普通教室",
    capacity: 30,
    projector: true,
    whiteboard: true,
    network: true,
    mic: false,
  },
  INS301: {
    name: "專題討論室",
    capacity: 20,
    projector: false,
    whiteboard: true,
    network: true,
    mic: false,
  },
  INS302: {
    name: "會議教室",
    capacity: 25,
    projector: true,
    whiteboard: true,
    network: true,
    mic: true,
  },
  ECG301: {
    name: "電資大樓電腦教室",
    capacity: 60,
    projector: true,
    whiteboard: true,
    network: true,
    mic: true,
  },
  ECG302: {
    name: "電資大樓普通教室",
    capacity: 50,
    projector: true,
    whiteboard: true,
    network: true,
    mic: false,
  },
  ECG310: {
    name: "視聽教室",
    capacity: 80,
    projector: true,
    whiteboard: false,
    network: true,
    mic: true,
  },
  LIB410: {
    name: "圖書館研討室 A",
    capacity: 12,
    projector: false,
    whiteboard: true,
    network: true,
    mic: false,
  },
  LIB411: {
    name: "圖書館研討室 B",
    capacity: 16,
    projector: false,
    whiteboard: true,
    network: true,
    mic: false,
  },
  GH101: {
    name: "綜一普通教室 101",
    capacity: 45,
    projector: true,
    whiteboard: true,
    network: true,
    mic: false,
  },
  GH102: {
    name: "綜一普通教室 102",
    capacity: 45,
    projector: true,
    whiteboard: true,
    network: true,
    mic: false,
  },
  GH201: {
    name: "綜二講堂 201",
    capacity: 120,
    projector: true,
    whiteboard: true,
    network: true,
    mic: true,
  },
  GH202: {
    name: "綜二普通教室 202",
    capacity: 60,
    projector: true,
    whiteboard: true,
    network: true,
    mic: false,
  },
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
  const [selectedDate, setSelectedDate] = useState(null); // 目前選到哪一天
  const [selectedTime, setSelectedTime] = useState(""); // 目前選到哪個時段

  // 月曆現在顯示的「月份」（固定在每月 1 號）
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // 最小日期：今天
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 最大日期：今天 + 6 個月
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);

  const isSameDate = (a, b) => {
    return (
      a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isBefore = (a, b) => a.getTime() < b.getTime();
  const isAfter = (a, b) => a.getTime() > b.getTime();

  // 產生目前月份月曆要顯示的 6x7 日期格
  const calendarDays = useMemo(() => {
    const days = [];
    const firstOfMonth = new Date(currentMonth); // ex: 2025-12-01
    const start = new Date(
      firstOfMonth.getFullYear(),
      firstOfMonth.getMonth(),
      1 - firstOfMonth.getDay() // 讓第一格是「該月第一天那週的星期日」
    );
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  // 是否可以往前 / 往後切換月份（避免超出半年範圍）
  const canGoPrev = useMemo(() => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    prevMonth.setDate(1);
    prevMonth.setHours(0, 0, 0, 0);

    const endPrev = new Date(prevMonth);
    endPrev.setMonth(endPrev.getMonth() + 1);
    endPrev.setDate(0); // 上個月最後一天
    endPrev.setHours(0, 0, 0, 0);

    return !isBefore(endPrev, today); // 只要這個月的最後一天 >= today 就可以往前
  }, [currentMonth, today]);

  const canGoNext = useMemo(() => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    return !isAfter(nextMonth, maxDate); // 下個月的 1 號不能比 maxDate 還晚
  }, [currentMonth, maxDate]);

  const handleChangeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    newMonth.setDate(1);
    newMonth.setHours(0, 0, 0, 0);

    // 安全檢查：若整個月份都在範圍外，就不切
    const monthStart = newMonth;
    const monthEnd = new Date(newMonth);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(0, 0, 0, 0);

    if (isAfter(monthStart, maxDate) || isBefore(monthEnd, today)) {
      return;
    }
    setCurrentMonth(newMonth);
  };

  // 產生可選時間下拉選單（8:00 ~ 21:00，每小時一格）
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      slots.push({ label: `${h}:00–${h + 1}:00`, start: h, end: h + 1 });
    }
    return slots;
  }, []);

  // 某一天已被預約的「小時集合」
  const occupiedSet = useMemo(() => {
    if (!selectedDate || !occupied) return new Set();
    const dateStr = formatDateLocal(selectedDate); // 用本地日期
    const blocks = occupied[dateStr] || [];
    const set = new Set();
    blocks.forEach((block) => {
      for (let h = block.start; h < block.end; h++) {
        set.add(h);
      }
    });
    return set;
  }, [selectedDate, occupied]);

  const handleSelectDate = (day) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);

    // 超出可選範圍就直接 return
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
      date: formatDateLocal(selectedDate), // 本地日期字串
      start: slot.start,
      end: slot.end,
    });
  };

  const formatMonthTitle = (d) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月`;

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
      {/* 左邊：月曆 */}
      <div className="cal-left">
        <div className="cal-title">選擇日期（未來 6 個月）</div>

        <div className="cal-month-header">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => handleChangeMonth(-1)}
            disabled={!canGoPrev}
          >
            ‹
          </button>
          <div className="cal-month-title">
            {formatMonthTitle(currentMonth)}
          </div>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => handleChangeMonth(1)}
            disabled={!canGoNext}
          >
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

      {/* 右邊：時間下拉 + 預約按鈕 */}
      <div className="cal-right">
        <div className="cal-title">選擇時間</div>
        <select
          className="cal-time-select"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
        >
          <option value="">請選擇時段</option>
          {timeSlots.map((slot) => (
            <option
              key={slot.label}
              value={slot.label}
              disabled={occupiedSet.has(slot.start)} // 此小時已被預約就禁用
            >
              {slot.label}
              {occupiedSet.has(slot.start) ? "（已被預約）" : ""}
            </option>
          ))}
        </select>

        <div className="wk-actions" style={{ marginTop: 16 }}>
          <button
            className="cb-btn"
            disabled={!selectedDate || !selectedTime}
            onClick={handleReserveClick}
          >
            {selectedDate && selectedTime
              ? `預約：${room}｜${formatDateLong(selectedDate)}｜${selectedTime}`
              : "請先選擇日期與時間"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassroomBooking() {
  const navigate = useNavigate();

  // 從 API 載入的資料 (buildings)
  const [buildings, setBuildings] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  /** 側邊「大樓搜尋」用 */
  const [buildingSearch, setBuildingSearch] = useState("");

  /** 進階搜尋條件（教室用） */
  const [keyword, setKeyword] = useState(""); // 關鍵字：201 也能抓到 INS201
  const [minCapacity, setMinCapacity] = useState(""); // 最少人數

  // 設備條件：投影機 / 白板 / 網路 / 麥克風
  const [needProjector, setNeedProjector] = useState(false);
  const [needWhiteboard, setNeedWhiteboard] = useState(false);
  const [needNetwork, setNeedNetwork] = useState(false);
  const [needMic, setNeedMic] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showRequests, setShowRequests] = useState(false); // 租借請求管理頁
  const [allReservations, setAllReservations] = useState([]); // 所有預約（管理員用）
  const [myReservations, setMyReservations] = useState([]); // 我的預約（一般使用者用）
  const [history, setHistory] = useState(() => {
    // 從 localStorage 載入歷史紀錄
    const saved = localStorage.getItem("reservation_history");
    return saved ? JSON.parse(saved) : [];
  });

  // 使用 useAuth hook 取得所有認證相關的狀態與函式
  // account 是 username (email), user 是使用者名稱, isAdmin 是管理員身份
  const { account, user, isAdmin, logout, refreshAccessToken } = useAuth();

  const [occupiedMap, setOccupiedMap] = useState({});

  // 當 history 改變時，儲存到 localStorage
  useEffect(() => {
    localStorage.setItem("reservation_history", JSON.stringify(history));
  }, [history]);

  // 載入大樓列表
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.buildings());
        if (!res.ok) throw new Error("載入大樓列表失敗");
        const data = await res.json();
        setBuildings(data);
      } catch (error) {
        console.error("載入大樓列表失敗:", error);
        alert("載入大樓列表失敗");
      }
    };
    fetchBuildings();
  }, []);

  // 載入教室列表（根據搜尋條件）
  useEffect(() => {
    if (!selectedBuilding) {
      setClassrooms([]);
      return;
    }

    const fetchClassrooms = async () => {
      try {
        const params = new URLSearchParams({
          building: selectedBuilding.code,
        });

        if (keyword) params.append("search", keyword);
        if (minCapacity) params.append("min_capacity", minCapacity);
        if (needProjector) params.append("has_projector", "true");
        if (needWhiteboard) params.append("has_whiteboard", "true");
        if (needNetwork) params.append("has_network", "true");
        if (needMic) params.append("has_mic", "true");

        const res = await fetch(API_ENDPOINTS.classrooms(params.toString()));
        if (!res.ok) throw new Error("載入教室列表失敗");
        const data = await res.json();
        setClassrooms(data.results || data);
        setSelectedRoom(null);
      } catch (error) {
        console.error("載入教室列表失敗:", error);
        alert("載入教室列表失敗");
      }
    };

    fetchClassrooms();
  }, [
    selectedBuilding,
    keyword,
    minCapacity,
    needProjector,
    needWhiteboard,
    needNetwork,
    needMic,
  ]);

  // 載入已預約時段（未來半年）
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchOccupiedSlots = async () => {
      try {
        // 只抓「今天 ~ 未來 6 個月」的預約資料
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 6);

        const params = new URLSearchParams({
          classroom: selectedRoom,
          date_from: formatDateLocal(today),
          date_to: formatDateLocal(endDate),
        });

        const res = await fetch(
          API_ENDPOINTS.occupiedSlots(params.toString())
        );
        if (!res.ok) throw new Error("載入預約時段失敗");
        const data = await res.json();

        // 轉成：{ "YYYY-MM-DD": [ {start, end}, ... ] }
        const byDate = {};
        data.forEach((slot) => {
          const dateStr = slot.date; // 後端回傳 "YYYY-MM-DD"
          const [start, end] = slot.time_slot.split("-").map(Number);
          if (!byDate[dateStr]) {
            byDate[dateStr] = [];
          }
          byDate[dateStr].push({ start, end });
        });

        // 只更新目前這間教室的占用資料
        setOccupiedMap((prev) => ({
          ...prev,
          [selectedRoom]: byDate,
        }));
      } catch (error) {
        console.error("載入預約時段失敗:", error);
        // 失敗時不動原本資料，避免把其他教室資訊洗掉
      }
    };

    fetchOccupiedSlots();
  }, [selectedRoom]);

  // 進入「歷史紀錄」時，從後端載入自己的預約
  useEffect(() => {
    if (!account || !showHistory) return;

    const fetchMyReservations = async () => {
      try {
        let token = localStorage.getItem("access_token");
        if (!token) return;

        const doRequest = async (accessToken) =>
          fetch(API_ENDPOINTS.reservations(), {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

        let res = await doRequest(token);

        // token 過期 → 嘗試 refresh
        if (res.status === 401) {
          const newToken = await refreshAccessToken();
          if (!newToken) {
            alert("登入已過期，請重新登入");
            logout();
            return;
          }
          res = await doRequest(newToken);
        }

        if (!res.ok) throw new Error("載入我的預約失敗");

        const data = await res.json();
        setMyReservations(data);
      } catch (err) {
        console.error("載入我的預約失敗:", err);
      }
    };

    fetchMyReservations();
  }, [account, showHistory, refreshAccessToken, logout]);

  /** 側邊大樓清單的搜尋結果 */
  const filteredBuildings = useMemo(() => {
    const kw = buildingSearch.trim().toLowerCase();
    if (!kw) return buildings;
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(kw) ||
        b.code.toLowerCase().includes(kw)
    );
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
  };

  /** 根據條件過濾教室（已由 API 處理，這裡只是保留前端邏輯） */
  const filteredRooms = useMemo(() => {
    return classrooms;
  }, [classrooms]);

  const resetSelection = () => {
    setSelectedBuilding(null);
    resetFilters();
  };

  /** 預約事件：打後端 /api/reservations/ */
  const handleReserve = async ({ room, date, start, end }) => {
    let token = localStorage.getItem("access_token");
    if (!token) {
      alert("請先登入後再預約");
      navigate("/login");
      return;
    }

    // date 已經是 "YYYY-MM-DD"
    const dateString = date;

    const payload = {
      classroom: room,
      date: dateString,
      time_slot: `${start}-${end}`,
      reason: "",
    };

    const makeRequest = async (accessToken) => {
      return await fetch(API_ENDPOINTS.reservations(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      let res = await makeRequest(token);
      let data = await res.json().catch(() => ({}));

      // 如果 token 過期，嘗試刷新
      if (res.status === 401 && data.code === "token_not_valid") {
        console.log("Token expired, attempting refresh...");
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

      console.log("reserve response =", res.status, data);

      if (!res.ok) {
        if (data.detail) {
          alert("預約失敗：" + data.detail);
        } else {
          alert("預約失敗：" + JSON.stringify(data));
        }
        return;
      }

      // 預約成功後重新載入該教室「未來半年」的已預約時段
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

          const res = await fetch(
            API_ENDPOINTS.occupiedSlots(params.toString())
          );
          if (!res.ok) throw new Error("載入預約時段失敗");

          const data = await res.json();

          const byDate = {};
          data.forEach((slot) => {
            const dateStr = slot.date;
            const [s, e] = slot.time_slot.split("-").map(Number);

            if (!byDate[dateStr]) {
              byDate[dateStr] = [];
            }

            byDate[dateStr].push({ start: s, end: e });
          });

          setOccupiedMap((prev) => ({
            ...prev,
            [room]: byDate,
          }));
        } catch (error) {
          console.error("載入預約時段失敗:", error);
        }
      };

      // 週幾顯示用
      const dObj = new Date(dateString);
      const jsDay = dObj.getDay(); // 0:日 ~ 6:六
      const dayIndex = ((jsDay + 6) % 7) + 1; // 1~7（週一~週日）
      const weekName = WEEK_DAYS[dayIndex - 1];

      // 更新本地歷史紀錄
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
        },
      ]);

      alert(
        `預約成功：${room}｜${dateString}（週${weekName}） ${start}:00–${end}:00`
      );

      await refreshOccupiedSlots();
    } catch (err) {
      console.error(err);
      alert("預約失敗：無法連線到伺服器");
    }
  };

  const handleCancelReservation = async (reservation) => {
    const { classroom, date, time_slot } = reservation;

    if (
      !window.confirm(
        `確定要取消 ${classroom} ${date} ${time_slot} 的預約嗎？`
      )
    ) {
      return;
    }

    try {
      let token = localStorage.getItem("access_token");

      const doRequest = async (accessToken) =>
        fetch(API_ENDPOINTS.updateReservationStatus(reservation.id), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          // 後端只接受 approved / rejected，所以取消用 rejected
          body: JSON.stringify({ status: "rejected" }),
        });

      let res = await doRequest(token);

      // token 過期
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

      // 更新前端 myReservations（標記這筆是「使用者取消」）
      setMyReservations((prev) =>
        prev.map((r) =>
          r.id === reservation.id
            ? { ...r, status: "rejected", _cancelledByUser: true }
            : r
        )
      );

      alert("預約已取消");
    } catch (error) {
      console.error("取消預約失敗:", error);
      alert(error.message || "取消預約失敗");
    }
  };

  /** 歷史頁（用 myReservations，支援取消） */
  const HistoryPanel = () => {
    const hasServerHistory = myReservations && myReservations.length > 0;
    const hasLocalHistory = history && history.length > 0;
    const hasHistory = hasServerHistory || hasLocalHistory;

    const getStatusLabel = (status, item) => {
      switch (status) {
        case "approved":
          return "已批准";
        case "rejected":
          // 有被我們標記 _cancelledByUser 的視為「已取消」
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
          return { color: "#1d4ed8", fontWeight: 600 }; // 藍色
        case "rejected":
          // 自己取消的顯示成灰色，被拒絕的顯示紅色
          return item?._cancelledByUser
            ? { color: "#6b7280", fontWeight: 600 } // 已取消：灰
            : { color: "#dc2626", fontWeight: 600 }; // 已拒絕：紅
        case "cancelled":
          return { color: "#6b7280", fontWeight: 600 }; // 灰
        case "pending":
        default:
          return { color: "#111827", fontWeight: 600 }; // 黑
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

    // 優先顯示從後端抓到的 myReservations
    const list = hasServerHistory ? myReservations : history;

    return (
      <div className="cb-section">
        <h2 className="cb-section-title">我的教室預約歷史</h2>
        <ol className="cb-list dashed cb-history-list">
          {[...list].reverse().map((item, idx) => {
            const fromServer = "classroom" in item;

            const room = fromServer ? item.classroom : item.room;
            const date = item.date;
            const status = item.status || "pending";

            const timeLabel = fromServer
              ? item.time_slot
              : `${item.start}:00–${item.end}:00`;

            const canCancel =
              fromServer && status !== "rejected" && status !== "cancelled";

            return (
              <li
                key={(item.id || item.ts) + "-" + idx}
                className="cb-history-item"
              >
                {/* 左邊文字 */}
                <div className="cb-history-main">
                  <div style={{ fontWeight: 800 }}>教室：{room}</div>
                  <div>
                    日期：{date} | 時段：{timeLabel}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    大樓：
                    {item.buildingName || item.buildingCode || "—"}
                  </div>
                  {item.ts && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        marginTop: 4,
                      }}
                    >
                      建立時間：{new Date(item.ts).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* 右邊狀態 + 取消按鈕 */}
                <div className="cb-history-status">
                  <span style={getStatusStyle(status, item)}>
                    {getStatusLabel(status, item)}
                  </span>

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
    if (!isAdmin) return;

    const fetchAllReservations = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `${API_ENDPOINTS.reservations()}?view_all=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.status === 401) {
          await refreshAccessToken();
          return;
        }

        if (!res.ok) throw new Error("載入預約列表失敗");

        const data = await res.json();
        setAllReservations(data);
      } catch (error) {
        console.error("載入預約列表失敗:", error);
        alert("載入預約列表失敗");
      }
    };

    fetchAllReservations();
  }, [isAdmin, showRequests, refreshAccessToken]);

  const handleReviewReservation = async (reservationId, newStatus) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        API_ENDPOINTS.updateReservationStatus(reservationId),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (res.status === 401) {
        await refreshAccessToken();
        return;
      }

      if (!res.ok) throw new Error("更新預約狀態失敗");

      setAllReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: newStatus } : r
        )
      );

      setMyReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: newStatus } : r
        )
      );

      alert(`預約已${newStatus === "approved" ? "批准" : "拒絕"}`);
    } catch (error) {
      console.error("更新預約狀態失敗:", error);
      alert("更新預約狀態失敗");
    }
  };

  const pendingReservations = allReservations.filter(
    (r) => r.status === "pending"
  );

  return (
    <div className="cb-section">
      <h2 className="cb-section-title">租借請求管理（僅管理員）</h2>
      {pendingReservations.length === 0 ? (
        <div className="cb-selection-banner">
          目前沒有任何待處理的請求。
        </div>
      ) : (
        <ol className="cb-list dashed">
          {pendingReservations.map((reservation) => (
            <li key={reservation.id}>
              <div style={{ fontWeight: 800 }}>
                教室：{reservation.classroom}
              </div>
              <div>
                申請人：{reservation.user_email || "未知"}
                {reservation.user_name && ` (${reservation.user_name})`}
              </div>
              <div>
                日期：{reservation.date} | 時段：{reservation.time_slot}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                用途：{reservation.reason || "無"}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                送出時間：
                {new Date(reservation.created_at).toLocaleString()}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  className="cb-btn"
                  onClick={() =>
                    handleReviewReservation(reservation.id, "approved")
                  }
                >
                  批准
                </button>
                <button
                  className="cb-btn"
                  style={{ background: "#d32f2f" }}
                  onClick={() =>
                    handleReviewReservation(reservation.id, "rejected")
                  }
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
      {/* 左側：大樓列表 */}
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
            <button
              className="cb-crumb"
              disabled={!selectedBuilding}
              onClick={resetSelection}
            >
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

          {/* 大樓搜尋欄 */}
          <div className="cb-search">
            <input
              className="cb-search-input"
              placeholder="搜尋大樓名稱或代碼…"
              value={buildingSearch}
              onChange={(e) => setBuildingSearch(e.target.value)}
            />
            {buildingSearch && (
              <button
                className="cb-search-clear"
                onClick={() => setBuildingSearch("")}
                aria-label="清除大樓搜尋"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* 大樓清單 */}
        <ul className="cb-tree">
          {filteredBuildings.map((b) => (
            <li
              key={b.code}
              className="cb-tree-item cb-tree-building"
              onClick={() => {
                // 點大樓時順便關掉歷史 / 確認租借畫面，回到預約
                setShowHistory(false);
                setShowRequests(false);
                setSelectedBuilding(b);
                resetFilters();
              }}
            >
              <span className="cb-building-code">{b.code}</span>
              <span className="cb-building-name">{b.name}</span>
            </li>
          ))}

          {filteredBuildings.length === 0 && (
            <li className="cb-tree-empty">找不到符合的教學大樓。</li>
          )}
        </ul>
      </aside>

      {/* 主畫面 */}
      <section className="cb-main">
        <div className="cb-hero">
          <div
            style={{
              display: "flex",
              gap: 10,
              marginLeft: "auto",
              alignItems: "center",
            }}
          >
            {(showHistory || showRequests) && (
              <button
                className="cb-login-btn"
                onClick={handleBackToBooking}
              >
                返回預約
              </button>
            )}

            <button
              className="cb-login-btn"
              onClick={() => {
                setShowHistory((v) => !v);
                if (showRequests) setShowRequests(false);
              }}
            >
              歷史紀錄
            </button>

            {isAdmin && (
              <button
                className="cb-login-btn"
                onClick={() => {
                  setShowRequests((v) => !v);
                  if (showHistory) setShowHistory(false);
                }}
              >
                確認租借
              </button>
            )}

            {isAdmin && (
              <button
                className="cb-login-btn"
                onClick={() => navigate("/editing-classroom")}
              >
                編輯教室
              </button>
            )}

            {isAdmin && (
              <button
                className="cb-login-btn"
                onClick={() => navigate("/blacklist")}
              >
                黑名單
              </button>
            )}

            {account ? (
              <>
                <button
                  className="cb-login-btn"
                  style={{ cursor: "default" }}
                  disabled
                >
                  {user}
                </button>

                <button
                  className="cb-login-btn"
                  onClick={handleLogout}
                >
                  登出
                </button>
              </>
            ) : (
              <button
                className="cb-login-btn"
                onClick={() => navigate("/login")}
              >
                登入
              </button>
            )}
          </div>
        </div>

        <div className="cb-card">
          <h1 className="cb-card-title">
            {showRequests
              ? "租借請求管理"
              : showHistory
              ? "我的教室預約歷史"
              : selectedBuilding
              ? "選擇教室與進階搜尋"
              : "教室預約系統說明"}
          </h1>

          {/* 三種畫面 */}
          {showRequests ? (
            <RequestPanel />
          ) : showHistory ? (
            <HistoryPanel />
          ) : selectedBuilding ? (
            <>
              <div className="cb-selection-banner">
                目前選擇：{selectedBuilding.name}（
                {selectedBuilding.code}）
              </div>

              {/* 進階搜尋列 */}
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
                    <label className="cb-filter-label">
                      最低容納人數
                    </label>
                    <select
                      className="cb-search-input"
                      value={minCapacity}
                      onChange={(e) => setMinCapacity(e.target.value)}
                    >
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
                      <input
                        type="checkbox"
                        checked={needProjector}
                        onChange={(e) =>
                          setNeedProjector(e.target.checked)
                        }
                      />
                      有投影機
                    </label>

                    <label className="cb-filter-check">
                      <input
                        type="checkbox"
                        checked={needWhiteboard}
                        onChange={(e) =>
                          setNeedWhiteboard(e.target.checked)
                        }
                      />
                      有白板
                    </label>

                    <label className="cb-filter-check">
                      <input
                        type="checkbox"
                        checked={needNetwork}
                        onChange={(e) =>
                          setNeedNetwork(e.target.checked)
                        }
                      />
                      有網路
                    </label>

                    <label className="cb-filter-check">
                      <input
                        type="checkbox"
                        checked={needMic}
                        onChange={(e) =>
                          setNeedMic(e.target.checked)
                        }
                      />
                      有麥克風
                    </label>
                  </div>

                  <button
                    className="cb-btn"
                    type="button"
                    onClick={resetFilters}
                  >
                    清除條件
                  </button>
                </div>
              </div>

              <div className="cb-divider" />

              {/* 教室清單 */}
              <div className="cb-section">
                <h2 className="cb-section-title">可借用教室</h2>
                {filteredRooms.length === 0 ? (
                  <div className="cb-selection-banner">
                    找不到符合條件的教室，請調整搜尋條件。
                  </div>
                ) : (
                  <div className="cb-room-grid">
                    {filteredRooms.map((classroom) => {
                      const active =
                        selectedRoom === classroom.room_code;

                      return (
                        <div
                          key={classroom.room_code}
                          className={
                            "cb-room-card" +
                            (active ? " cb-room-card-active" : "")
                          }
                          onClick={() =>
                            setSelectedRoom(classroom.room_code)
                          }
                        >
                          <div className="cb-room-code">
                            {classroom.room_code}
                          </div>
                          <div className="cb-room-name">
                            {classroom.name || "教室"}
                          </div>
                          <div className="cb-room-capacity">
                            容納人數：約{" "}
                            {classroom.capacity || "—"} 人
                          </div>
                          <div className="cb-room-tags">
                            {classroom.has_projector && (
                              <span className="cb-tag">
                                投影機
                              </span>
                            )}
                            {classroom.has_whiteboard && (
                              <span className="cb-tag">白板</span>
                            )}
                            {classroom.has_mic && (
                              <span className="cb-tag">麥克風</span>
                            )}
                            {classroom.has_network && (
                              <span className="cb-tag">網路</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 預約日曆 */}
              {selectedRoom && (
                <>
                  <div className="cb-divider" />
                  <div className="cb-section">
                    <h2 className="cb-section-title">預約時段</h2>
                    <div className="wk-room-banner">
                      目前教室：{selectedRoom}
                      {selectedRoomMeta?.name
                        ? `｜${selectedRoomMeta.name}`
                        : ""}
                    </div>
                    <DateTimeCalendar
                      room={selectedRoom}
                      occupied={occupiedMap[selectedRoom] || {}}
                      onReserve={handleReserve}
                    />
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
                  <li>點選下方時段並提出租借。</li>
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
