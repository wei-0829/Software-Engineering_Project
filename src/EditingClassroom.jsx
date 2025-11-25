import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./EditingClassroom.css";

export default function EditingClassroom() {
  const navigate = useNavigate();

  // 🔹 一開始就先放一間預設教室：INS201，可容納 30 人， 後端讀取教室資料後放進來這裡
  const [classrooms, setClassrooms] = useState([
    {
      id: 1,
      building_code: "INS",
      room_code: "INS201",
      capacity: 30,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [newBuilding, setNewBuilding] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState("");

  // 後端修改此處的程式碼，改成與後端互動

  // 🔹（前端版）新增教室，只改 state，不打後端
  const handleCreate = () => {
    if (!newBuilding || !newRoom || !newCapacity) {
      alert("請填寫完整資訊");
      return;
    }

    const capNum = Number(newCapacity);
    if (Number.isNaN(capNum) || capNum < 0) {
      alert("請輸入正確的人數");
      return;
    }

    setSaving(true);

    // 簡單產一個 id
    const newId = Date.now();

    setClassrooms((list) => [
      ...list,
      {
        id: newId,
        building_code: newBuilding,
        room_code: newRoom,
        capacity: capNum,
      },
    ]);

    setNewBuilding("");
    setNewRoom("");
    setNewCapacity("");
    setSaving(false);
  };

  // 🔹（前端版）更新教室人數，只改 state
  const handleUpdateCapacity = (cls) => {
    const capNum = Number(cls.capacity);
    if (Number.isNaN(capNum) || capNum < 0) {
      alert("請輸入正確的人數");
      return;
    }

    setSaving(true);

    setClassrooms((list) =>
      list.map((c) =>
        c.id === cls.id ? { ...c, capacity: capNum } : c
      )
    );

    setSaving(false);
    alert("已更新教室人數（僅前端模擬）");
  };

  // 🔹（前端版）刪除教室，只改 state
  const handleDelete = (cls) => {
    if (!window.confirm(`確定要刪除 ${cls.building_code} / ${cls.room_code} 嗎？`)) {
      return;
    }

    setSaving(true);
    setClassrooms((list) => list.filter((c) => c.id !== cls.id));
    setSaving(false);
  };

  return (
    <div className="cb-root">
      <section className="cb-main" style={{ width: "100%" }}>
        <div className="cb-hero">
          <div
            style={{
              display: "flex",
              gap: 10,
              marginLeft: "auto",
              alignItems: "center",
            }}
          >
            <button className="cb-login-btn" onClick={() => navigate("/")}>
              回到預約畫面
            </button>
          </div>
        </div>

        <div className="cb-card">
          <h1 className="cb-card-title">編輯教室</h1>

          {/* 教室列表 */}
          <div className="cb-section">
            <h2 className="cb-section-title">目前教室</h2>
            {classrooms.length === 0 ? (
              <div className="cb-selection-banner">目前尚未設定任何教室。</div>
            ) : (
              <div className="cb-table-wrap">
                <table className="cb-table">
                  <thead>
                    <tr>
                      <th>大樓代碼</th>
                      <th>教室代碼</th>
                      <th>可容納人數</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classrooms.map((c, idx) => (
                      <tr key={c.id ?? idx}>
                        <td>{c.building_code}</td>
                        <td>{c.room_code}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="cb-input-inline"
                            value={c.capacity}
                            onChange={(e) => {
                              const value = e.target.value;
                              setClassrooms((list) =>
                                list.map((x) =>
                                  x.id === c.id ? { ...x, capacity: value } : x
                                )
                              );
                            }}
                          />
                        </td>
                        <td>
                          <button
                            className="cb-btn"
                            disabled={saving}
                            onClick={() => handleUpdateCapacity(c)}
                          >
                            儲存人數
                          </button>
                          <button
                            className="cb-btn"
                            style={{ marginLeft: 8, background: "#d32f2f" }}
                            disabled={saving}
                            onClick={() => handleDelete(c)}
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 新增教室 */}
          <div className="cb-divider" />

          <div className="cb-section">
            <h2 className="cb-section-title">新增教室</h2>
            <div className="cb-form-row">
              <label>
                大樓代碼
                <input
                  className="cb-search-input"
                  placeholder="例如：INS / ECG"
                  value={newBuilding}
                  onChange={(e) => setNewBuilding(e.target.value)}
                />
              </label>

              <label>
                教室代碼
                <input
                  className="cb-search-input"
                  placeholder="例如：INS201"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                />
              </label>

              <label>
                可容納人數
                <input
                  type="number"
                  min="0"
                  className="cb-search-input"
                  placeholder="例如：30 / 60"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                />
              </label>

              <button
                className="cb-btn"
                style={{ alignSelf: "flex-end" }}
                disabled={saving}
                onClick={handleCreate}
              >
                新增教室
              </button>
            </div>
          </div>
        </div>

        <div className="editing-footer">
          <span>海大教室預約系統</span>
        </div>
      </section>
    </div>

  );
}
