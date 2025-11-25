import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./ClassroomBooking.css";

/** 大樓清單 */
const BUILDINGS = [
  { code: "INS", name: "資工系館", rooms: ["INS201", "INS202", "INS301", "INS302"] },
  { code: "ECG", name: "電資暨綜合教學大樓", rooms: ["ECG301", "ECG302", "ECG310"] },
  { code: "LIB", name: "圖書館大樓", rooms: ["LIB410", "LIB411"] },
  { code: "GH1", name: "綜合一館", rooms: ["GH101", "GH102"] },
  { code: "GH2", name: "綜合二館", rooms: ["GH201", "GH202"] },
];

const WEEK_DAYS = ["一", "二", "三", "四", "五", "六", "日"];
const START_HOUR = 8;
const END_HOUR = 21;

const PRESET_OCCUPIED = {
  INS201: [
    { day: 1, start: 10, end: 12 },
    { day: 3, start: 14, end: 16 },
  ],
  INS202: [
    { day: 2, start: 9, end: 11 },
    { day: 5, start: 13, end: 15 },
  ],
  ECG301: [{ day: 4, start: 8, end: 10 }],
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
            ? `預約：${room}｜週${WEEK_DAYS[selected.day - 1]} ${selected.hour}:00–${
                selected.hour + 1
              }:00`
            : "選擇一個可預約的時段"}
        </button>
      </div>
    </div>
  );
}

export default function ClassroomBooking() {
  const [q, setQ] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRequests, setShowRequests] = useState(false); // 👈 新增：租借請求管理頁
  const [history, setHistory] = useState([]);
  const [isAdmin, setIsAdmin] = useState(true); // 👈 模擬是否為管理員（可改成後端登入判斷）

  const navigate = useNavigate();
  const [occupiedMap, setOccupiedMap] = useState(PRESET_OCCUPIED);

  const filteredBuildings = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return BUILDINGS;
    return BUILDINGS.filter(
      (b) => b.code.toLowerCase().includes(kw) || b.name.toLowerCase().includes(kw)
    );
  }, [q]);

  const filteredRooms = useMemo(() => {
    if (!selectedBuilding) return [];
    const kw = q.trim().toLowerCase();
    const rooms = selectedBuilding.rooms || [];
    if (!kw) return rooms;
    return rooms.filter((r) => r.toLowerCase().includes(kw));
  }, [q, selectedBuilding]);

  const resetSelection = () => {
    setSelectedBuilding(null);
    setSelectedRoom(null);
  };

  /** 預約事件：同時打後端 /api/reservations/ */
// 在 ClassroomBooking.jsx 裡，原本的 handleReserve 換成這個

  const handleReserve = async ({ room, day, start, end }) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("請先登入後再預約");
      navigate("/login");
      return;
    }

    //  把「週幾」換成真正日期（這一週的週一 + (day-1)）
    const base = new Date();               // 今天
    let weekday = base.getDay();           // 0(週日)~6(週六)
    if (weekday === 0) weekday = 7;        // 改成 1~7，週一=1
    base.setDate(base.getDate() - (weekday - 1)); // 推回本週週一
    base.setHours(0, 0, 0, 0);

    const d = new Date(base);
    d.setDate(base.getDate() + (day - 1)); // 加上 day-1，變成該週的那一天
    const dateString = d.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // 組後端要的 payload
    const payload = {
      classroom: room,                 // room_code（例如 "CS201"）
      date: dateString,               // 例如 "2025-11-24"
      time_slot: `${start}-${end}`,   // 例如 "1-2" / "3-4" / "8-10" 自己約定
      reason: "",                     // 先留空，有需要再加欄位
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/reservations/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,   // 🔑 JWT 放這裡
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      console.log("reserve response =", res.status, data);

      if (!res.ok) {
        alert("預約失敗：" + JSON.stringify(data));
        return;
      }

      // 後端成功 → 再更新前端畫面
      setOccupiedMap((prevMap) => {
        const next = { ...prevMap };
        const prev = next[room] || [];
        next[room] = [...prev, { day, start, end }];
        return next;
      });

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
          status: data.status || "pending", // 後端回什麼就用什麼
        },
      ]);

      alert(
        `預約成功：${room}｜週${WEEK_DAYS[day - 1]} ${start}:00–${end}:00（日期 ${dateString}）`
      );
    } catch (err) {
      console.error(err);
      alert("預約失敗：無法連線到伺服器");
    }
  };



  /** 歷史頁 */
  const HistoryPanel = () => (
    <div className="cb-section">
      <h2 className="cb-section-title">我的教室預約歷史</h2>
      {history.length === 0 ? (
        <div className="cb-selection-banner">目前沒有任何預約紀錄。</div>
      ) : (
        <ol className="cb-list dashed">
          {[...history].reverse().map((h, idx) => (
            <li key={idx}>
              <div style={{ fontWeight: 800 }}>
                {h.buildingName}（{h.buildingCode}） / {h.room}
              </div>
              <div>
                時段：週{WEEK_DAYS[h.day - 1]} {h.start}:00–{h.end}:00
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                狀態：{h.status}｜建立時間：{new Date(h.ts).toLocaleString()}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  /** 管理員租借請求審核頁 */
  const RequestPanel = () => (
    <div className="cb-section">
      <h2 className="cb-section-title">租借請求管理（僅管理員）</h2>
      {history.length === 0 ? (
        <div className="cb-selection-banner">目前沒有任何待處理的請求。</div>
      ) : (
        <ol className="cb-list dashed">
          {[...history].reverse().map((h, idx) => (
            <li key={idx}>
              <div style={{ fontWeight: 800 }}>
                {h.buildingName}（{h.buildingCode}） / {h.room}
              </div>
              <div>
                時段：週{WEEK_DAYS[h.day - 1]} {h.start}:00–{h.end}:00
              </div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                送出時間：{new Date(h.ts).toLocaleString()}
              </div>
              {h.status === "待確認" && (
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button
                    className="cb-btn"
                    onClick={() =>
                      setHistory((list) =>
                        list.map((x, i) =>
                          i === idx ? { ...x, status: "已批准" } : x
                        )
                      )
                    }
                  >
                    批准
                  </button>
                  <button
                    className="cb-btn"
                    style={{ background: "#d32f2f" }}
                    onClick={() =>
                      setHistory((list) =>
                        list.map((x, i) =>
                          i === idx ? { ...x, status: "已拒絕" } : x
                        )
                      )
                    }
                  >
                    拒絕
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <div className="cb-root">
      {/* 左側 */}
      <aside className="cb-sidebar">
        <div className="cb-brand">
          <div className="cb-brand-top">
            <div className="cb-logo" />
            <div>
              <div className="cb-brand-name">國立臺灣海洋大學</div>
              <div className="cb-brand-sub">海大教室預約系統</div>
            </div>
          </div>

          <div className="cb-search">
            <input
              className="cb-search-input"
              placeholder={selectedBuilding ? "搜尋教室…" : "搜尋大樓或代碼…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                className="cb-search-clear"
                onClick={() => setQ("")}
                aria-label="清除搜尋"
              >
                ×
              </button>
            )}
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
        </div>

        {/* 目錄 */}
        <ul className="cb-tree">
          {!selectedBuilding &&
            filteredBuildings.map((b) => (
              <li
                key={b.code}
                className="cb-tree-item cb-tree-building"
                onClick={() => {
                  setSelectedBuilding(b);
                  setSelectedRoom(null);
                  setQ("");
                }}
              >
                <span className="cb-building-code">{b.code}</span>
                <span className="cb-building-name">{b.name}</span>
              </li>
            ))}
          {selectedBuilding &&
            (filteredRooms.length > 0 ? (
              filteredRooms.map((r) => (
                <li
                  key={r}
                  className={
                    "cb-tree-item cb-tree-room" +
                    (selectedRoom === r ? " is-active" : "")
                  }
                  onClick={() => setSelectedRoom(r)}
                >
                  <span className="cb-room-name">{r}</span>
                </li>
              ))
            ) : (
              <li className="cb-tree-empty">
                {q ? "找不到符合的教室" : "此大樓尚未設定教室清單。"}
              </li>
            ))}
        </ul>
      </aside>

      {/* 主畫面 */}
      <section className="cb-main">
        <div className="cb-hero">
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="cb-login-btn"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? "返回預約" : "歷史紀錄"}
            </button>

            {isAdmin && (
              <button
                className="cb-login-btn"
                onClick={() => setShowRequests((v) => !v)}
              >
                {showRequests ? "返回預約" : "確認租借"}
              </button>
            )}

            <button className="cb-login-btn" onClick={() => navigate("/login")}>
              登入
            </button>
          </div>
        </div>

        <div className="cb-card">
          <h1 className="cb-card-title">
            {showRequests
              ? "租借請求管理"
              : showHistory
              ? "我的教室預約歷史"
              : "教室預約系統說明"}
          </h1>

          {/* 三個畫面：管理員 / 歷史 / 一般預約 */}
          {showRequests ? (
            <RequestPanel />
          ) : showHistory ? (
            <HistoryPanel />
          ) : selectedBuilding && selectedRoom ? (
            <div className="cb-section">
              <div className="cb-selection-banner">
                目前選擇：{selectedBuilding.name}（{selectedBuilding.code}） / {selectedRoom}
              </div>
              <h2 className="cb-section-title">可預約時段</h2>
              <WeekCalendar
                room={selectedRoom}
                occupied={occupiedMap[selectedRoom] || []}
                onReserve={handleReserve}
              />
            </div>
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
                  <li>選擇大樓 → 教室。</li>
                  <li>查看可用時段並提出租借。</li>
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
