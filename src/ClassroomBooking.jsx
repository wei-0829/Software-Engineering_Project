import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

/** 大樓清單（代碼＋名稱＋示例教室） */
const BUILDINGS = [
  { code: "INS", name: "資工系館", rooms: ["INS201", "INS202", "INS301", "INS302"] },
  { code: "ECG", name: "電資暨綜合教學大樓", rooms: ["ECG301", "ECG302", "ECG310"] },
  { code: "LIB", name: "圖書館大樓", rooms: ["LIB410", "LIB411"] },
  { code: "GH1", name: "綜合一館", rooms: ["GH101", "GH102"] },
  { code: "GH2", name: "綜合二館", rooms: ["GH201", "GH202"] },
  // …其餘大樓可慢慢補；或改成呼叫後端回傳
];

/** 簡單的周曆常數 */
const WEEK_DAYS = ["一", "二", "三", "四", "五", "六", "日"]; // 1..7
const START_HOUR = 8;  // 08:00
const END_HOUR = 21;   // 21:00（最後一格是 20-21）

/** 範例：預先佔用的時段資料（實務上改成呼叫後端） */
const PRESET_OCCUPIED = {
  "INS201": [
    { day: 1, start: 10, end: 12 }, // 週一 10-12
    { day: 3, start: 14, end: 16 }, // 週三 14-16
  ],
  "INS202": [
    { day: 2, start: 9, end: 11 },
    { day: 5, start: 13, end: 15 },
  ],
  "ECG301": [{ day: 4, start: 8, end: 10 }],
};

/** 工具：把區間展開成一小時格陣列（例如 10–12 => 10,11） */
function expandBlocks(blocks) {
  const set = new Set();
  blocks.forEach(({ day, start, end }) => {
    for (let h = start; h < end; h++) {
      set.add(`${day}-${h}`);
    }
  });
  return set;
}

/** 週曆元件（輕量、無外部套件） */
function WeekCalendar({ room, occupied, onReserve }) {
  const [selected, setSelected] = useState(null); // {day, hour}

  const occSet = useMemo(() => expandBlocks(occupied), [occupied]);

  const cells = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    const row = [];
    for (let d = 1; d <= 7; d++) {
      const key = `${d}-${hour}`;
      const isBlocked = occSet.has(key);
      const isSel = selected && selected.day === d && selected.hour === hour;
      row.push(
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
    cells.push(
      <div key={`row-${hour}`} className="wk-row">
        <div className="wk-hour">{`${hour}:00`}</div>
        {row}
      </div>
    );
  }

  return (
    <div className="wk-wrap">
      <div className="wk-head">
        <div className="wk-hour wk-head-empty" />
        {WEEK_DAYS.map((d, i) => (
          <div key={d} className="wk-day">{`週${d}`}</div>
        ))}
      </div>

      <div className="wk-body">{cells}</div>

      <div className="wk-actions">
        <button
          className="cb-btn"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            const payload = {
              room,
              day: selected.day,
              start: selected.hour,
              end: selected.hour + 1,
            };
            onReserve?.(payload);
          }}
        >
          {selected
            ? `預約：${room}｜週${WEEK_DAYS[selected.day - 1]} ${selected.hour}:00–${selected.hour + 1
            }:00`
            : "選擇一個可預約的時段"}
        </button>
      </div>
    </div>
  );
}

export default function ClassroomBooking() {
  const [showLogin, setShowLogin] = useState(false);
  const [q, setQ] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const navigate = useNavigate();

  // 前端暫存：每間教室的已占用時段（模擬後端）
  const [occupiedMap, setOccupiedMap] = useState(PRESET_OCCUPIED);

  // 依關鍵字篩大樓
  const filteredBuildings = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return BUILDINGS;
    return BUILDINGS.filter(
      (b) =>
        b.code.toLowerCase().includes(kw) ||
        b.name.toLowerCase().includes(kw)
    );
  }, [q]);

  // 依關鍵字篩教室
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

  /** 預約事件：這裡先做前端寫入；之後可改成呼叫 API */
  const handleReserve = ({ room, day, start, end }) => {
    // 實務上：POST 到 /api/reservations
    const next = { ...occupiedMap };
    const prev = next[room] || [];
    next[room] = [...prev, { day, start, end }];
    setOccupiedMap(next);
    alert(`已送出預約（示例）：${room}｜週${WEEK_DAYS[day - 1]} ${start}:00–${end}:00`);
  };

  return (
    <div className="cb-root">
      {/* 左側側欄：品牌 + 搜尋 + 麵包屑 + 目錄 */}
      <aside className="cb-sidebar">
        <div className="cb-brand">
          <div className="cb-brand-top">
            <div className="cb-logo" />
            <div>
              <div className="cb-brand-name">國立臺灣海洋大學</div>
              <div className="cb-brand-sub">海大教室預約系統</div>
            </div>
          </div>

          {/* 搜尋列 */}
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

          {/* 麵包屑 */}
          <div className="cb-breadcrumb">
            <button
              className="cb-crumb"
              disabled={!selectedBuilding}
              onClick={resetSelection}
              title="返回大樓清單"
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

        {/* 目錄：大樓 or 教室 */}
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
                role="button"
                tabIndex={0}
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
                  role="button"
                  tabIndex={0}
                >
                  <span className="cb-room-name">{r}</span>
                </li>
              ))
            ) : (
              <li className="cb-tree-empty">
                {q ? "找不到符合的教室" : "此大樓尚未設定教室清單，請稍後接上 API。"}
              </li>
            ))}
        </ul>
      </aside>

      {/* 右側 */}
      <section className="cb-main">
        <div className="cb-hero">
          <button className="cb-login-btn" onClick={() => navigate("/login")}>登入</button>
        </div>

        <div className="cb-card">
          <h1 className="cb-card-title">教室預約系統說明</h1>

          {selectedBuilding && selectedRoom && (
            <div className="cb-selection-banner">
              目前選擇：{selectedBuilding.name}（{selectedBuilding.code}） / {selectedRoom}
            </div>
          )}

          {/* 沒選到教室：顯示說明；選到教室：顯示週曆 */}
          {!selectedRoom ? (
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
                  <li>使用校園帳號登入（學生/老師/系統管理員）。</li>
                  <li>可依「大樓 → 教室」階層瀏覽。</li>
                  <li>選擇時間檢視該教室的可借用時段並點選想要的日期與時段。</li>
                  <li>確定日期時間和教室位置和設備後，即可租借教室。</li>
                  <li>借用當日去租借鑰匙，使用結束後，確認教室整潔和設備無異常並歸還鑰匙。</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="cb-section">
              <h2 className="cb-section-title">可預約時段</h2>
              <WeekCalendar
                room={selectedRoom}
                occupied={occupiedMap[selectedRoom] || []}
                onReserve={handleReserve}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
