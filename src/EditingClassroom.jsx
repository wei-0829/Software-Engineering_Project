import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./EditingClassroom.css";
import { API_ENDPOINTS } from "./config/api.js";
import { useAuth } from "./useAuth";

export default function EditingClassroom() {
  const navigate = useNavigate();
  const { isAdmin, refreshAccessToken, logout } = useAuth();

  const [classrooms, setClassrooms] = useState([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true); // ✅ 新增：列表載入狀態

  const [saving, setSaving] = useState(false);
  const [newBuilding, setNewBuilding] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newEquip, setNewEquip] = useState({
    has_projector: false,
    has_whiteboard: false,
    has_network: false,
    has_mic: false,
  });

  useEffect(() => {
    if (!isAdmin) {
      alert("只有管理員才能存取此頁面");
      navigate("/");
      return;
    }

    let alive = true;

    const fetchClassrooms = async () => {
      try {
        if (alive) setLoadingClassrooms(true); // ✅ 開始載入
        const res = await fetch(API_ENDPOINTS.classrooms("page_size=200")); // 取得所有教室
        if (!res.ok) throw new Error("載入教室列表失敗");
        const data = await res.json();
        if (alive) setClassrooms(data.results || []);
      } catch (error) {
        console.error("載入教室列表失敗:", error);
        alert("載入教室列表失敗");
        if (alive) setClassrooms([]); // ✅ 保底
      } finally {
        if (alive) setLoadingClassrooms(false); // ✅ 不管成功失敗都結束載入
      }
    };

    fetchClassrooms();

    return () => {
      alive = false;
    };
  }, [isAdmin, navigate]);

  // 🔹 新增教室
  const handleCreate = async () => {
    if (!newBuilding || !newRoomCode || !newCapacity || !newRoomName) {
      alert("請填寫所有必填欄位（大樓、教室代碼、教室名稱、人數）");
      return;
    }

    const capNum = Number(newCapacity);
    if (Number.isNaN(capNum) || capNum <= 0) {
      alert("請輸入正確的人數");
      return;
    }

    setSaving(true);

    const payload = {
      building: newBuilding.toUpperCase(),
      room_code: newRoomCode.toUpperCase(),
      name: newRoomName,
      capacity: capNum,
      ...newEquip,
    };

    const makeRequest = async (accessToken) => {
      return await fetch(API_ENDPOINTS.classrooms(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      let token = localStorage.getItem("access_token");
      let res = await makeRequest(token);

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await makeRequest(newToken);
        } else {
          throw new Error("登入已過期，請重新登入");
        }
      }

      if (!res.ok) {
        const errData = await res.json();
        const errorString = Object.entries(errData)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
        throw new Error(errorString || "新增失敗");
      }

      const newClassroom = await res.json();
      setClassrooms((prev) =>
        [...prev, newClassroom].sort((a, b) => a.room_code.localeCompare(b.room_code))
      );
      alert(`教室 ${newClassroom.room_code} 已成功新增！`);
      // 清空表單
      setNewBuilding("");
      setNewRoomCode("");
      setNewRoomName("");
      setNewCapacity("");
      setNewEquip({ has_projector: false, has_whiteboard: false, has_network: false, has_mic: false });
    } catch (error) {
      alert(`新增錯誤：\n${error.message}`);
      if (error.message.includes("登入已過期")) {
        logout();
        navigate("/login");
      }
    } finally {
      setSaving(false);
    }
  };

  // 🔹 更新教室設定（人數 + 設備），串接後端 API
  const handleSaveClassroom = async (cls) => {
    const capNum = Number(cls.capacity);
    if (Number.isNaN(capNum) || capNum < 0) {
      alert("請輸入正確的人數");
      return;
    }

    setSaving(true);

    const payload = {
      capacity: capNum,
      has_projector: cls.has_projector,
      has_whiteboard: cls.has_whiteboard,
      has_network: cls.has_network,
      has_mic: cls.has_mic,
    };

    const makeRequest = async (accessToken) => {
      return await fetch(API_ENDPOINTS.classroomDetail(cls.room_code), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      let token = localStorage.getItem("access_token");
      let res = await makeRequest(token);

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await makeRequest(newToken);
        } else {
          alert("登入已過期，請重新登入");
          logout();
          navigate("/login");
          return;
        }
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "更新失敗");
      }

      const updatedRoom = await res.json();

      // 後端成功後，更新前端 state
      setClassrooms((list) =>
        list.map((c) => (c.room_code === updatedRoom.room_code ? updatedRoom : c))
      );

      alert(`教室 ${updatedRoom.room_code} 已成功儲存！`);
    } catch (error) {
      console.error("儲存失敗:", error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 🔹 切換單一教室的設備 checkbox
  const toggleEquip = (roomCode, field) => {
    setClassrooms((list) =>
      list.map((c) => (c.room_code === roomCode ? { ...c, [field]: !c[field] } : c))
    );
  };

  // 🔹 刪除教室
  const handleDelete = async (cls) => {
    if (!window.confirm(`確定要刪除 ${cls.building} / ${cls.room_code} 嗎？`)) {
      return;
    }

    setSaving(true);

    const makeRequest = async (accessToken) => {
      return await fetch(API_ENDPOINTS.classroomDetail(cls.room_code), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    };

    try {
      let token = localStorage.getItem("access_token");
      let res = await makeRequest(token);

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          res = await makeRequest(newToken);
        } else {
          throw new Error("登入已過期，請重新登入");
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "刪除失敗");
      }

      setClassrooms((list) => list.filter((c) => c.room_code !== cls.room_code));
      alert(`教室 ${cls.room_code} 已成功刪除！`);
    } catch (error) {
      alert(`刪除失敗：\n${error.message}`);
      if (error.message.includes("登入已過期")) {
        logout();
        navigate("/login");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return null; // 權限檢查中或權限不足，不渲染任何東西
  }

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

            {/* ✅ 這裡改成：載入中 > 有資料 > 空資料 */}
            {loadingClassrooms ? (
              <div className="cb-selection-banner">載入中...</div>
            ) : classrooms.length === 0 ? (
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
                    {classrooms.map((c) => (
                      <tr key={c.room_code}>
                        <td>{c.building}</td>
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
                                  x.room_code === c.room_code ? { ...x, capacity: value } : x
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
                                checked={!!c.has_projector}
                                onChange={() => toggleEquip(c.room_code, "has_projector")}
                              />
                              有投影機
                            </label>
                            <label className="cb-equip-check">
                              <input
                                type="checkbox"
                                checked={!!c.has_whiteboard}
                                onChange={() => toggleEquip(c.room_code, "has_whiteboard")}
                              />
                              有白板
                            </label>
                            <label className="cb-equip-check">
                              <input
                                type="checkbox"
                                checked={!!c.has_network}
                                onChange={() => toggleEquip(c.room_code, "has_network")}
                              />
                              有網路
                            </label>
                            <label className="cb-equip-check">
                              <input
                                type="checkbox"
                                checked={!!c.has_mic}
                                onChange={() => toggleEquip(c.room_code, "has_mic")}
                              />
                              有麥克風
                            </label>
                          </div>
                        </td>
                        <td>
                          <button className="cb-btn" disabled={saving} onClick={() => handleSaveClassroom(c)}>
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
            <div className="add-form-grid">
              {/* ----- 基本資訊 ----- */}
              <div className="form-group">
                <label className="form-label">大樓代碼</label>
                <input
                  className="form-input"
                  placeholder="例如：INS"
                  value={newBuilding}
                  onChange={(e) => setNewBuilding(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label className="form-label">教室代碼</label>
                <input
                  className="form-input"
                  placeholder="例如：INS201"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label className="form-label">教室名稱</label>
                <input
                  className="form-input"
                  placeholder="例如：資工系電腦教室"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">可容納人數</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="例如：40"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                />
              </div>

              {/* ----- 設備 ----- */}
              <div className="form-group-span">
                <label className="form-label">設備</label>
                <div className="equip-grid">
                  {[
                    { key: "has_projector", label: "投影機" },
                    { key: "has_whiteboard", label: "白板" },
                    { key: "has_network", label: "網路" },
                    { key: "has_mic", label: "麥克風" },
                  ].map((item) => (
                    <label key={item.key} className="equip-check">
                      <input
                        type="checkbox"
                        checked={newEquip[item.key]}
                        onChange={(e) =>
                          setNewEquip((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* ----- 按鈕 ----- */}
              <div className="form-actions">
                <button className="cb-btn" disabled={saving} onClick={handleCreate}>
                  {saving ? "新增中..." : "確認新增教室"}
                </button>
              </div>
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
