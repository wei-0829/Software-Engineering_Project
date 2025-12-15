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

// 輔助函數：取得本週的週一
function getWeekStart() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// 輔助函數：取得本週的週日
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

/** 週曆元件 */
function WeekCalendar({ room, occupied, onReserve }) {
  const [selected, setSelected] = useState(null);
  const occSet = useMemo(() => expandBlocks(occupied), [occupied]);

  const rows = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    const rowCells = [];
    for (let d = 1; d <= 7; d++) {
      const key = `${d}-${hour}`;
      const isBlocked = occSet.has(key);
      const isSel = selected && selected.day === d && selected.hour === hour;
      rowCells.push(
        <div
          key={key}
          className={
            "wk-cell" +
            (isBlocked ? " is-occupied" : " is-free") +
            (isSel ? " is-selected" : "")
          }
          role="button"
          tabIndex={0}
          onClick={() => {
            if (isBlocked) return;
            setSelected(isSel ? null : { day: d, hour });
          }}
          title={
            isBlocked
              ? "已被預約"
              : `可預約：週${WEEK_DAYS[d - 1]} ${hour}:00–${hour + 1}:00`
          }
        />
      );
    }
    rows.push(
      <div key={`row-${hour}`} className="wk-row">
        <div className="wk-hour">{`${hour}:00`}</div>
        {rowCells}
      </div>
    );
  }

  return (
    <div className="wk-wrap">
      <div className="wk-head">
        <div className="wk-hour wk-head-empty" />
        {WEEK_DAYS.map((d) => (
          <div key={d} className="wk-day">{`週${d}`}</div>
        ))}
      </div>

      <div className="wk-body">{rows}</div>

      <div className="wk-actions">
        <button
          className="cb-btn"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            onReserve?.({
              room,
              day: selected.day,
              start: selected.hour,
              end: selected.hour + 1,
            });
          }}
        >
          {selected
            ? `預約：${room}｜週${WEEK_DAYS[selected.day - 1]} ${
                selected.hour
              }:00–${selected.hour + 1}:00`
            : "選擇一個可預約的時段"}
        </button>
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

  // 注意：isAdmin 的狀態現在由 useAuth hook 管理，
  // 當 account 變化時，useAuth 內部會自動更新 isAdmin 狀態。

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

        if (keyword) params.append('search', keyword);
        if (minCapacity) params.append('min_capacity', minCapacity);
        if (needProjector) params.append('has_projector', 'true');
        if (needWhiteboard) params.append('has_whiteboard', 'true');
        if (needNetwork) params.append('has_network', 'true');
        if (needMic) params.append('has_mic', 'true');

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
  }, [selectedBuilding, keyword, minCapacity, needProjector, needWhiteboard, needNetwork, needMic]);

  // 載入已預約時段
  useEffect(() => {
    if (!selectedRoom) {
      return;
    }

    const fetchOccupiedSlots = async () => {
      try {
        const weekStart = getWeekStart();
        const weekEnd = getWeekEnd();
        
        const params = new URLSearchParams({
          classroom: selectedRoom,
          date_from: weekStart.toISOString().split('T')[0],
          date_to: weekEnd.toISOString().split('T')[0],
        });

        const res = await fetch(API_ENDPOINTS.occupiedSlots(params.toString()));
        if (!res.ok) throw new Error("載入預約時段失敗");
        const data = await res.json();
        
        // 轉換成前端格式
        const occupied = {};
        data.forEach(slot => {
          const date = new Date(slot.date);
          const weekStart = getWeekStart();
          const dayDiff = Math.floor((date - weekStart) / (1000 * 60 * 60 * 24));
          const day = dayDiff + 1; // 1-7 (週一到週日)
          
          const [start, end] = slot.time_slot.split('-').map(Number);
          
          if (!occupied[selectedRoom]) {
            occupied[selectedRoom] = [];
          }
          occupied[selectedRoom].push({ day, start, end });
        });
        
        setOccupiedMap(occupied);
      } catch (error) {
        console.error("載入預約時段失敗:", error);
        // 失敗時使用空資料，不影響使用
        setOccupiedMap({});
      }
    };

    fetchOccupiedSlots();
  }, [selectedRoom]);

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
    logout(); // 呼叫從 useAuth 來的 logout 函式，它會處理 token 的清除
    setHistory([]);
    setShowHistory(false);
    setShowRequests(false);
    // 其他元件狀態的重置
    setSelectedBuilding(null);
    setSelectedRoom(null);
    setClassrooms([]);
  };

  /** 根據條件過濾教室（已由 API 處理，這裡只是保留前端邏輯） */
  const filteredRooms = useMemo(() => {
    // 直接使用從 API 載入的教室列表
    return classrooms;
  }, [classrooms]);

  const resetSelection = () => {
    setSelectedBuilding(null);
    resetFilters();
  };

  /** 預約事件：打後端 /api/reservations/ */
  const handleReserve = async ({ room, day, start, end }) => {
    let token = localStorage.getItem("access_token");
    if (!token) {
      alert("請先登入後再預約");
      navigate("/login");
      return;
    }

    // 把「週幾」換成真正日期（這一週的週一 + (day-1)）
    const weekStart = getWeekStart();
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + (day - 1));
    const dateString = d.toISOString().slice(0, 10); // "YYYY-MM-DD"

    const payload = {
      classroom: room, // room_code（例如 "INS201"）
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
          // 用新 token 重試
          token = newToken;
          res = await makeRequest(token);
          data = await res.json().catch(() => ({}));
        } else {
          // 刷新失敗，需要重新登入
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

      // 預約成功後重新載入該教室的已預約時段
      const refreshOccupiedSlots = async () => {
        try {
          const weekStart = getWeekStart();
          const weekEnd = getWeekEnd();
          
          const params = new URLSearchParams({
            classroom: room,
            date_from: weekStart.toISOString().split('T')[0],
            date_to: weekEnd.toISOString().split('T')[0],
          });

          const res = await fetch(API_ENDPOINTS.occupiedSlots(params.toString()));
          if (!res.ok) throw new Error("載入預約時段失敗");
          const data = await res.json();
          
          // 轉換成前端格式
          const occupied = {};
          data.forEach(slot => {
            const date = new Date(slot.date);
            const weekStart = getWeekStart();
            const dayDiff = Math.floor((date - weekStart) / (1000 * 60 * 60 * 24));
            const day = dayDiff + 1; // 1-7 (週一到週日)
            
            const [start, end] = slot.time_slot.split('-').map(Number);
            
            if (!occupied[room]) {
              occupied[room] = [];
            }
            occupied[room].push({ day, start, end });
          });
          
          setOccupiedMap(prev => ({
            ...prev,
            ...occupied
          }));
        } catch (error) {
          console.error("載入預約時段失敗:", error);
        }
      };

      // 更新本地歷史紀錄
      setHistory((old) => [
        ...old,
        {
          ts: new Date().toISOString(),
          buildingName: selectedBuilding?.name || "",
          buildingCode: selectedBuilding?.code || "",
          room,
          day,
          start,
          end,
          status: data.status || "pending",
        },
      ]);

      alert(
        `預約成功：${room}｜週${WEEK_DAYS[day - 1]} ${start}:00–${end}:00（日期 ${dateString}）`
      );

      // 重新載入已預約時段
      await refreshOccupiedSlots();
    } catch (err) {
      console.error(err);
      alert("預約失敗：無法連線到伺服器");
    }
  };

  /** 歷史頁 */
  const HistoryPanel = () => {
    // 載入我的預約（一般使用者和管理員都只看自己的）
    useEffect(() => {
      if (!showHistory) return;

      const fetchMyReservations = async () => {
        try {
          const token = localStorage.getItem("access_token");
          // 不傳 view_all 參數,後端會只回傳自己的預約
          const res = await fetch(API_ENDPOINTS.reservations(), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.status === 401) {
            await refreshAccessToken();
            return;
          }

          if (!res.ok) throw new Error("載入預約列表失敗");

          const data = await res.json();
          setMyReservations(data);
        } catch (error) {
          console.error("載入預約列表失敗:", error);
          alert("載入預約列表失敗");
        }
      };

      fetchMyReservations();
    }, [showHistory]);

    // 狀態顯示轉換
    const getStatusText = (status) => {
      const statusMap = {
        pending: "待審核",
        approved: "已批准",
        rejected: "已拒絕",
        cancelled: "已取消",
      };
      return statusMap[status] || status;
    };

    // 取消預約
    const handleCancelReservation = async (reservation) => {
      if (
        !window.confirm(
          `確定要取消 ${reservation.classroom} ${reservation.date} ${reservation.time_slot} 的預約嗎？`
        )
      ) {
        return;
      }

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
          throw new Error(errBody.error || "取消預約失敗");
        }

        // 更新前端 myReservations
        setMyReservations((prev) =>
          prev.map((r) =>
            r.id === reservation.id ? { ...r, status: "cancelled" } : r
          )
        );

        alert("預約已成功取消");
      } catch (error) {
        console.error("取消預約失敗:", error);
        alert(error.message || "取消預約失敗");
      }
    };

    return (
      <div className="cb-section">
        <h2 className="cb-section-title">我的教室預約歷史</h2>
        {myReservations.length === 0 ? (
          <div className="cb-selection-banner">目前沒有任何預約紀錄。</div>
        ) : (
          <ol className="cb-list dashed">
            {[...myReservations].reverse().map((reservation) => (
              <li key={reservation.id}>
                <div style={{ fontWeight: 800 }}>
                  教室：{reservation.classroom}
                </div>
                <div>
                  日期：{reservation.date} | 時段：{reservation.time_slot}
                </div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  用途：{reservation.reason || "無"}
                </div>
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    狀態：{getStatusText(reservation.status)} | 建立時間：
                    {new Date(reservation.created_at).toLocaleString()}
                  </span>
                  {(reservation.status === "pending" ||
                    reservation.status === "approved") && (
                    <button
                      className="cb-btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        background: "#dc2626",
                      }}
                      onClick={() => handleCancelReservation(reservation)}
                    >
                      取消預約
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  };

  /** 管理員租借請求審核頁 */
  const RequestPanel = () => {
    // 載入所有預約（管理員專用）
    useEffect(() => {
      if (!isAdmin) return;

      const fetchAllReservations = async () => {
        try {
          const token = localStorage.getItem("access_token");
          // 傳入 view_all=true 參數,讓後端回傳所有使用者的預約
          const res = await fetch(`${API_ENDPOINTS.reservations()}?view_all=true`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

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
    }, [isAdmin, showRequests]);

    // 審核預約（批准/拒絕）
    const handleReviewReservation = async (reservationId, newStatus) => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(API_ENDPOINTS.updateReservationStatus(reservationId), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.status === 401) {
          await refreshAccessToken();
          return;
        }

        if (!res.ok) throw new Error("更新預約狀態失敗");

        // 更新本地狀態
        setAllReservations((prev) =>
          prev.map((r) =>
            r.id === reservationId ? { ...r, status: newStatus } : r
          )
        );

        // 如果審核的是當前使用者的預約,也更新 myReservations
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

    // 只顯示 pending 狀態的預約
    const pendingReservations = allReservations.filter(
      (r) => r.status === "pending"
    );

    return (
      <div className="cb-section">
        <h2 className="cb-section-title">租借請求管理（僅管理員）</h2>
        {pendingReservations.length === 0 ? (
          <div className="cb-selection-banner">目前沒有任何待處理的請求。</div>
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
                  送出時間：{new Date(reservation.created_at).toLocaleString()}
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
    // 從 classrooms 陣列中找到選中的教室
    return classrooms.find(c => c.room_code === selectedRoom);
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
              <button className="cb-login-btn" onClick={handleBackToBooking}>
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

            {account ? (
              <>
                <button
                  className="cb-login-btn"
                  style={{ cursor: "default" }}
                  disabled
                >
                  {user}
                </button>

                <button className="cb-login-btn" onClick={handleLogout}>
                  登出
                </button>
              </>
            ) : (
              <button className="cb-login-btn" onClick={() => navigate("/login")}>
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
              {/* 已選大樓提示 */}
              <div className="cb-selection-banner">
                目前選擇：{selectedBuilding.name}（{selectedBuilding.code}）
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
                    <label className="cb-filter-label">最低容納人數</label>
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
                        onChange={(e) => setNeedProjector(e.target.checked)}
                      />
                      有投影機
                    </label>

                    <label className="cb-filter-check">
                      <input
                        type="checkbox"
                        checked={needWhiteboard}
                        onChange={(e) => setNeedWhiteboard(e.target.checked)}
                      />
                      有白板
                    </label>

                    <label className="cb-filter-check">
                      <input
                        type="checkbox"
                        checked={needNetwork}
                        onChange={(e) => setNeedNetwork(e.target.checked)}
                      />
                      有網路
                    </label>

                    <label className="cb-filter-check">
                      <input
                        type="checkbox"
                        checked={needMic}
                        onChange={(e) => setNeedMic(e.target.checked)}
                      />
                      有麥克風
                    </label>
                  </div>

                  <button className="cb-btn" type="button" onClick={resetFilters}>
                    清除條件
                  </button>
                </div>
              </div>

              <div className="cb-divider" />

              {/* 教室清單（像商品卡片 grid） */}
              <div className="cb-section">
                <h2 className="cb-section-title">可借用教室</h2>
                {filteredRooms.length === 0 ? (
                  <div className="cb-selection-banner">
                    找不到符合條件的教室，請調整搜尋條件。
                  </div>
                ) : (
                  <div className="cb-room-grid">
                    {filteredRooms.map((classroom) => {
                      const active = selectedRoom === classroom.room_code;

                      return (
                        <div
                          key={classroom.room_code}
                          className={
                            "cb-room-card" + (active ? " cb-room-card-active" : "")
                          }
                          onClick={() => setSelectedRoom(classroom.room_code)}
                        >
                          <div className="cb-room-code">{classroom.room_code}</div>
                          <div className="cb-room-name">{classroom.name || "教室"}</div>
                          <div className="cb-room-capacity">
                            容納人數：約 {classroom.capacity || "—"} 人
                          </div>
                          <div className="cb-room-tags">
                            {classroom.has_projector && (
                              <span className="cb-tag">投影機</span>
                            )}
                            {classroom.has_whiteboard && (
                              <span className="cb-tag">白板</span>
                            )}
                            {classroom.has_mic && <span className="cb-tag">麥克風</span>}
                            {classroom.has_network && <span className="cb-tag">網路</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 預約週曆 */}
              {selectedRoom && (
                <>
                  <div className="cb-divider" />
                  <div className="cb-section">
                    <h2 className="cb-section-title">預約時段</h2>
                    <div className="wk-room-banner">
                      目前教室：{selectedRoom}
                      {selectedRoomMeta?.name ? `｜${selectedRoomMeta.name}` : ""}
                    </div>
                    <WeekCalendar
                      room={selectedRoom}
                      occupied={occupiedMap[selectedRoom] || []}
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
