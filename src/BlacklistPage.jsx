// Blacklist.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./BlacklistPage.css";
import { useAuth } from "./useAuth";

export default function Blacklist() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [normalUsers, setNormalUsers] = useState([]);
  const [blacklistedUsers, setBlacklistedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔹 進頁面時先塞一些「假資料」
  useEffect(() => {
    if (!isAdmin) {
      alert("只有管理員才能存取此頁面");
      navigate("/");
      return;
    }

    // 之後要改成從後端撈資料，就把這裡換掉即可
    const mockNormal = [
      {
        id: 1,
        name: "王小明",
        student_id: "1123456",
        email: "s1123456@ntou.edu.tw",
        is_blacklisted: false,
      },
      {
        id: 2,
        name: "陳小美",
        student_id: "1127890",
        email: "s1127890@ntou.edu.tw",
        is_blacklisted: false,
      },
      {
        id: 3,
        name: "李同學",
        student_id: "1130011",
        email: "s1130011@ntou.edu.tw",
        is_blacklisted: false,
      },
    ];

    const mockBlacklisted = [
      {
        id: 4,
        name: "林問題",
        student_id: "1119999",
        email: "s1119999@ntou.edu.tw",
        is_blacklisted: true,
      },
    ];

    setNormalUsers(mockNormal);
    setBlacklistedUsers(mockBlacklisted);
    setLoading(false);
  }, [isAdmin, navigate]);

  // 🔹 停權（左 -> 右），暫時只改前端 state，不打 API
  const handleBlockUser = (user) => {
    if (!window.confirm(`確定要將 ${user.name || user.email} 加入黑名單嗎？`)) {
      return;
    }

    setSaving(true);

    // 模擬一下 loading（其實可以不用 setTimeout）
    setTimeout(() => {
      setNormalUsers((list) => list.filter((u) => u.id !== user.id));
      setBlacklistedUsers((list) =>
        [...list, { ...user, is_blacklisted: true }].sort((a, b) =>
          (a.name || a.email).localeCompare(b.name || b.email)
        )
      );
      setSaving(false);
      alert(`已將 ${user.name || user.email} 加入黑名單（前端測試資料）`);
    }, 200);
  };

  // 🔹 恢復（右 -> 左），一樣只動前端 state
  const handleRestoreUser = (user) => {
    if (!window.confirm(`確定要恢復 ${user.name || user.email} 的使用權嗎？`)) {
      return;
    }

    setSaving(true);

    setTimeout(() => {
      setBlacklistedUsers((list) => list.filter((u) => u.id !== user.id));
      setNormalUsers((list) =>
        [...list, { ...user, is_blacklisted: false }].sort((a, b) =>
          (a.name || a.email).localeCompare(b.name || b.email)
        )
      );
      setSaving(false);
      alert(`已恢復 ${user.name || user.email} 的使用權（前端測試資料）`);
    }, 200);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="cb-root">
      <section className="cb-main" style={{ width: "100%" }}>
        {/* 上方藍色區 + 返回按鈕（沿用風格） */}
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

        <div className="cb-card bl-main-card">
          <h1 className="cb-card-title">黑名單管理</h1>

          {loading ? (
            <div className="cb-selection-banner">使用者資料載入中…</div>
          ) : (
            <div className="bl-columns">
              {/* 左：正常使用者 */}
              <div className="bl-column">
                <div className="bl-column-header">
                  <h2 className="cb-section-title">正常使用者</h2>
                  <span className="bl-count-badge">
                    共 {normalUsers.length} 人
                  </span>
                </div>

                {normalUsers.length === 0 ? (
                  <div className="cb-selection-banner bl-empty">
                    目前沒有可用的正常使用者。
                  </div>
                ) : (
                  <div className="cb-table-wrap bl-table-wrap">
                    <table className="cb-table bl-table">
                      <thead>
                        <tr>
                          <th>姓名</th>
                          <th>學號 / 帳號</th>
                          <th>信箱</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{u.name || "—"}</td>
                            <td>{u.student_id || u.username || "—"}</td>
                            <td>{u.email || "—"}</td>
                            <td>
                              <button
                                className="cb-btn bl-btn-block"
                                disabled={saving}
                                onClick={() => handleBlockUser(u)}
                              >
                                停權
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 中間箭頭區域 */}
              <div className="bl-arrows">
                <div className="bl-arrow-icon bl-arrow-red">⇨</div>   {/* 停權：紅色 */}
                <div className="bl-arrow-icon bl-arrow-green">⇦</div> {/* 恢復：綠色 */}
              </div>

              {/* 右：黑名單 */}
              <div className="bl-column">
                <div className="bl-column-header">
                  <h2 className="cb-section-title">黑名單</h2>
                  <span className="bl-count-badge bl-count-badge-danger">
                    共 {blacklistedUsers.length} 人
                  </span>
                </div>

                {blacklistedUsers.length === 0 ? (
                  <div className="cb-selection-banner bl-empty">
                    目前黑名單是空的。
                  </div>
                ) : (
                  <div className="cb-table-wrap bl-table-wrap">
                    <table className="cb-table bl-table">
                      <thead>
                        <tr>
                          <th>姓名</th>
                          <th>學號 / 帳號</th>
                          <th>信箱</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blacklistedUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{u.name || "—"}</td>
                            <td>{u.student_id || u.username || "—"}</td>
                            <td>{u.email || "—"}</td>
                            <td>
                              <button
                                className="cb-btn bl-btn-restore"
                                disabled={saving}
                                onClick={() => handleRestoreUser(u)}
                              >
                                恢復
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="blacklist-footer">
          <span>海大教室預約系統</span>
        </div>
      </section>
    </div>
  );
}
