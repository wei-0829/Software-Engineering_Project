import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./EditingClassroom.css";

export default function EditingClassroom() {
  const navigate = useNavigate();

  // 🔹 一開始先放一間教室（示範用）
  const [classrooms, setClassrooms] = useState([
    {
      id: 1,
      building_code: "INS",
      room_code: "INS201",
      capacity: 30,
      hasProjector: true,
      hasWhiteboard: true,
      hasNetwork: true,
      hasMic: false,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [newBuilding, setNewBuilding] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState("");

  // 新增教室時的設備預設值
  const [newEquip, setNewEquip] = useState({
    hasProjector: false,
    hasWhiteboard: false,
    hasNetwork: false,
    hasMic: false,
  });

  // 🔹 新增教室（目前只改前端 state）
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

    const newId = Date.now();

    setClassrooms((list) => [
      ...list,
      {
        id: newId,
        building_code: newBuilding,
        room_code: newRoom,
        capacity: capNum,
        ...newEquip,
      },
    ]);

    setNewBuilding("");
    setNewRoom("");
    setNewCapacity("");
    setNewEquip({
      hasProjector: false,
      hasWhiteboard: false,
      hasNetwork: false,
      hasMic: false,
    });
    setSaving(false);
  };

  // 🔹 更新教室設定（人數 + 設備），目前只改 state
  const handleSaveClassroom = (cls) => {
    const capNum = Number(cls.capacity);
    if (Number.isNaN(capNum) || capNum < 0) {
      alert("請輸入正確的人數");
      return;
    }

    setSaving(true);

    setClassrooms((list) =>
      list.map((c) =>
        c.id === cls.id ? { ...cls, capacity: capNum } : c
      )
    );

    setSaving(false);
    alert("已儲存教室設定（僅前端模擬）");
  };

  // 🔹 切換單一教室的設備 checkbox
  const toggleEquip = (id, field) => {
    setClassrooms((list) =>
      list.map((c) =>
        c.id === id ? { ...c, [field]: !c[field] } : c
      )
    );
  };

  // 🔹 刪除教室
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
                      <th>設備</th>
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
                          <div className="cb-equip-cell">
                            <label className="cb-equip-check">
                              <input
                                type="checkbox"
                                checked={!!c.hasProjector}
                                onChange={() =>
                                  toggleEquip(c.id, "hasProjector")
                                }
                              />
                              有投影機
                            </label>
                            <label className="cb-equip-check">
                              <input
                                type="checkbox"
                                checked={!!c.hasWhiteboard}
                                onChange={() =>
                                  toggleEquip(c.id, "hasWhiteboard")
                                }
                              />
                              有白板
                            </label>
                            <label className="cb-equip-check">
                              <input
                                type="checkbox"
                                checked={!!c.hasNetwork}
                                onChange={() =>
                                  toggleEquip(c.id, "hasNetwork")
                                }
                              />
                              有網路
                            </label>
                            <label className="cb-equip-check">
                              <input
                                type="checkbox"
                                checked={!!c.hasMic}
                                onChange={() =>
                                  toggleEquip(c.id, "hasMic")
                                }
                              />
                              有麥克風
                            </label>
                          </div>
                        </td>
                        <td>
                          <button
                            className="cb-btn"
                            disabled={saving}
                            onClick={() => handleSaveClassroom(c)}
                          >
                            儲存設定
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

              <div className="cb-equip-new">
                <span className="cb-equip-label">設備</span>
                <div className="cb-equip-grid">
                  <label className="cb-equip-check">
                    <input
                      type="checkbox"
                      checked={newEquip.hasProjector}
                      onChange={(e) =>
                        setNewEquip((prev) => ({
                          ...prev,
                          hasProjector: e.target.checked,
                        }))
                      }
                    />
                    有投影機
                  </label>
                  <label className="cb-equip-check">
                    <input
                      type="checkbox"
                      checked={newEquip.hasWhiteboard}
                      onChange={(e) =>
                        setNewEquip((prev) => ({
                          ...prev,
                          hasWhiteboard: e.target.checked,
                        }))
                      }
                    />
                    有白板
                  </label>
                  <label className="cb-equip-check">
                    <input
                      type="checkbox"
                      checked={newEquip.hasNetwork}
                      onChange={(e) =>
                        setNewEquip((prev) => ({
                          ...prev,
                          hasNetwork: e.target.checked,
                        }))
                      }
                    />
                    有網路
                  </label>
                  <label className="cb-equip-check">
                    <input
                      type="checkbox"
                      checked={newEquip.hasMic}
                      onChange={(e) =>
                        setNewEquip((prev) => ({
                          ...prev,
                          hasMic: e.target.checked,
                        }))
                      }
                    />
                    有麥克風
                  </label>
                </div>
              </div>

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
