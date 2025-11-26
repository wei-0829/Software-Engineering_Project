// ClassroomBooking.jsx
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

/** 先用前端假資料描述教室資訊 */
const ROOM_META = {
  INS201: {
    name: "資工系電腦教室",
    capacity: 40,
    projector: true,
    teacherPC: true,
    wheelchair: false,
  },
  INS202: {
    name: "資工系普通教室",
    capacity: 30,
    projector: true,
    teacherPC: false,
    wheelchair: false,
  },
  INS301: {
    name: "專題討論室",
    capacity: 20,
    projector: false,
    teacherPC: true,
    wheelchair: false,
  },
  INS302: {
    name: "會議教室",
    capacity: 25,
    projector: true,
    teacherPC: true,
    wheelchair: true,
  },
  ECG301: {
    name: "電資大樓電腦教室",
    capacity: 60,
    projector: true,
    teacherPC: true,
    wheelchair: true,
  },
  ECG302: {
    name: "電資大樓普通教室",
    capacity: 50,
    projector: true,
    teacherPC: false,
    wheelchair: true,
  },
  ECG310: {
    name: "視聽教室",
    capacity: 80,
    projector: true,
    teacherPC: true,
    wheelchair: true,
  },
  LIB410: {
    name: "圖書館研討室 A",
    capacity: 12,
    projector: false,
    teacherPC: false,
    wheelchair: true,
  },
  LIB411: {
    name: "圖書館研討室 B",
    capacity: 16,
    projector: false,
    teacherPC: false,
    wheelchair: true,
  },
  GH101: {
    name: "綜一普通教室 101",
    capacity: 45,
    projector: true,
    teacherPC: false,
    wheelchair: false,
  },
  GH102: {
    name: "綜一普通教室 102",
    capacity: 45,
    projector: true,
    teacherPC: false,
    wheelchair: true,
  },
  GH201: {
    name: "綜二講堂 201",
    capacity: 120,
    projector: true,
    teacherPC: true,
    wheelchair: true,
  },
  GH202: {
    name: "綜二普通教室 202",
    capacity: 60,
    projector: true,
    teacherPC: false,
    wheelchair: true,
  },
};

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

  /** 側邊「大樓搜尋」用 */
  const [buildingSearch, setBuildingSearch] = useState("");

  /** 進階搜尋條件（教室用） */
  const [keyword, setKeyword] = useState(""); // 關鍵字：201 也能抓到 INS201
  const [minCapacity, setMinCapacity] = useState(""); // 最少人數
  const [needProjector, setNeedProjector] = useState(false);
  const [needTeacherPC, setNeedTeacherPC] = useState(false);
  const [needWheelchair, setNeedWheelchair] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showRequests, setShowRequests] = useState(false); // 租借請求管理頁
  const [history, setHistory] = useState([]);
  const [isAdmin, setIsAdmin] = useState(true); // 模擬是否為管理員（可改成後端登入判斷）

  const [occupiedMap, setOccupiedMap] = useState(PRESET_OCCUPIED);
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("username");
  });

  /** 側邊大樓清單的搜尋結果 */
  const filteredBuildings = useMemo(() => {
    const kw = buildingSearch.trim().toLowerCase();
    if (!kw) return BUILDINGS;
    return BUILDINGS.filter(
      (b) =>
        b.name.toLowerCase().includes(kw) ||
        b.code.toLowerCase().includes(kw)
    );
  }, [buildingSearch]);

  const resetFilters = () => {
    setKeyword("");
    setMinCapacity("");
    setNeedProjector(false);
    setNeedTeacherPC(false);
    setNeedWheelchair(false);
    setSelectedRoom(null);
  };

  const handleBackToBooking = () => {
    setShowHistory(false);
    setShowRequests(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    setUsername(null);
    setShowHistory(false);
    setShowRequests(false);
  };

  /** 根據條件過濾教室 */
  const filteredRooms = useMemo(() => {
    if (!selectedBuilding) return [];
    const rooms = selectedBuilding.rooms || [];

    const kw = keyword.trim().toLowerCase();
    const minCap = Number(minCapacity) || 0;

    return rooms.filter((roomCode) => {
      const meta = ROOM_META[roomCode] || {};

      // 關鍵字（教室代碼 + 教室名稱）
      if (kw) {
        const matchCode = roomCode.toLowerCase().includes(kw);
        const matchName = (meta.name || "").toLowerCase().includes(kw);
        if (!matchCode && !matchName) return false;
      }

      // 人數
      if (minCap > 0 && (meta.capacity || 0) < minCap) return false;

      // 設備
      if (needProjector && !meta.projector) return false;
      if (needTeacherPC && !meta.teacherPC) return false;
      if (needWheelchair && !meta.wheelchair) return false;

      return true;
    });
  }, [selectedBuilding, keyword, minCapacity, needProjector, needTeacherPC, needWheelchair]);

  const resetSelection = () => {
    setSelectedBuilding(null);
    resetFilters();
  };

  /** 預約事件：打後端 /api/reservations/ */
  const handleReserve = async ({ room, day, start, end }) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("請先登入後再預約");
      navigate("/login");
      return;
    }

    // 把「週幾」換成真正日期（這一週的週一 + (day-1)）
    const base = new Date(); // 今天
    let weekday = base.getDay(); // 0(週日)~6(週六)
    if (weekday === 0) weekday = 7; // 改成 1~7，週一=1
    base.setDate(base.getDate() - (weekday - 1)); // 推回本週週一
    base.setHours(0, 0, 0, 0);

    const d = new Date(base);
    d.setDate(base.getDate() + (day - 1)); // 加上 day-1，變成該週的那一天
    const dateString = d.toISOString().slice(0, 10); // "YYYY-MM-DD"

    const payload = {
      classroom: room, // room_code（例如 "INS201"）
      date: dateString,
      time_slot: `${start}-${end}`,
      reason: "",
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/reservations/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
          status: data.status || "pending",
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

  const selectedRoomMeta = selectedRoom ? ROOM_META[selectedRoom] : null;

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

          {/* 新增：大樓搜尋欄 */}
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

            {username ? (
              <>
                <button
                  className="cb-login-btn"
                  style={{ cursor: "default", opacity: 0.9 }}
                  disabled
                >
                  {username}
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
                        checked={needTeacherPC}
                        onChange={(e) => setNeedTeacherPC(e.target.checked)}
                      />
                      有教師電腦
                    </label>
                    <label className="cb-filter-check">
                      <input
                        type="checkbox"
                        checked={needWheelchair}
                        onChange={(e) => setNeedWheelchair(e.target.checked)}
                      />
                      無障礙教室
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
                    {filteredRooms.map((roomCode) => {
                      const meta = ROOM_META[roomCode] || {};
                      const active = selectedRoom === roomCode;

                      return (
                        <div
                          key={roomCode}
                          className={
                            "cb-room-card" + (active ? " cb-room-card-active" : "")
                          }
                          onClick={() => setSelectedRoom(roomCode)}
                        >
                          <div className="cb-room-code">{roomCode}</div>
                          <div className="cb-room-name">{meta.name || "教室"}</div>
                          <div className="cb-room-capacity">
                            容納人數：約 {meta.capacity || "—"} 人
                          </div>
                          <div className="cb-room-tags">
                            {meta.projector && <span className="cb-tag">投影機</span>}
                            {meta.teacherPC && (
                              <span className="cb-tag">教師電腦</span>
                            )}
                            {meta.wheelchair && <span className="cb-tag">無障礙</span>}
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
