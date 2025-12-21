// Blacklist.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./BlacklistPage.css";
import { useAuth } from "./useAuth";
import { API_ENDPOINTS } from "./config/api.js";

export default function Blacklist() {
  const navigate = useNavigate();
  const { isAdmin, refreshAccessToken } = useAuth();

  const [normalUsers, setNormalUsers] = useState([]);
  const [blacklistedUsers, setBlacklistedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ 統一 fetch：自動帶 token + 401 refresh 後重試一次
  const apiFetch = useCallback(
    async (url, options = {}, retry = true) => {
      const token = localStorage.getItem("access_token");

      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 401 && retry) {
        await refreshAccessToken();
        return apiFetch(url, options, false);
      }

      return res;
    },
    [refreshAccessToken]
  );

  // ✅ 讀取：GET /api/blacklist/users/ -> { normal_users, blacklisted_users }
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.blacklistUsers(), { method: "GET" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "載入黑名單清單失敗");
      }

      const data = await res.json();

      const normal = (data.normal_users || []).slice().sort((a, b) =>
        (a.first_name + a.last_name || a.username || a.email || "").localeCompare(
          b.first_name + b.last_name || b.username || b.email || ""
        )
      );

      const black = (data.blacklisted_users || []).slice().sort((a, b) =>
        (a.first_name + a.last_name || a.username || a.email || "").localeCompare(
          b.first_name + b.last_name || b.username || b.email || ""
        )
      );

      setNormalUsers(normal);
      setBlacklistedUsers(black);
    } catch (err) {
      console.error(err);
      alert("載入使用者清單失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!isAdmin) {
      alert("只有管理員才能存取此頁面");
      navigate("/");
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate, fetchUsers]);

  // ✅ 停權：POST /api/blacklist/ban/ { user_id, reason }
  const handleBlockUser = async (user) => {
    const displayName =
      (user.first_name || "") + (user.last_name || "") || user.username || user.email;

    if (!window.confirm(`確定要將 ${displayName} 加入黑名單嗎？`)) return;

    // 你後端支援 reason（可選）
    const reason = window.prompt("可選填：停權原因（可留空）", "") ?? "";
    if (reason === null) return; // 使用者按取消（保險）

    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.banUser(), {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, reason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "停權失敗");
      }

      await fetchUsers();
      alert(`已將 ${displayName} 加入黑名單`);
    } catch (err) {
      console.error(err);
      alert(err.message || "停權失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  // ✅ 恢復：POST /api/blacklist/unban/ { user_id }
  const handleRestoreUser = async (user) => {
    const displayName =
      (user.first_name || "") + (user.last_name || "") || user.username || user.email;

    if (!window.confirm(`確定要恢復 ${displayName} 的使用權嗎？`)) return;

    setSaving(true);
    try {
      const res = await apiFetch(API_ENDPOINTS.unbanUser(), {
        method: "POST",
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "恢復失敗");
      }

      await fetchUsers();
      alert(`已恢復 ${displayName} 的使用權`);
    } catch (err) {
      console.error(err);
      alert(err.message || "恢復失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="cb-root">
      <section className="cb-main" style={{ width: "100%" }}>
        <div className="cb-hero">
          <div style={{ display: "flex", gap: 10, marginLeft: "auto", alignItems: "center" }}>
            <button className="cb-login-btn" onClick={() => navigate("/")}>
              返回主頁
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
                  <span className="bl-count-badge">共 {normalUsers.length} 人</span>
                </div>

                {normalUsers.length === 0 ? (
                  <div className="cb-selection-banner bl-empty">目前沒有可用的正常使用者。</div>
                ) : (
                  <div className="cb-table-wrap bl-table-wrap">
                    <table className="cb-table bl-table">
                      <thead>
                        <tr>
                          <th>使用者名稱</th>
                          <th>學號 / 帳號</th>
                          <th>信箱</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{(u.first_name || "") + (u.last_name || "") || "—"}</td>
                            <td>{u.username || "—"}</td>
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

              {/* 右：黑名單 */}
              <div className="bl-column">
                <div className="bl-column-header">
                  <h2 className="cb-section-title">黑名單</h2>
                  <span className="bl-count-badge bl-count-badge-danger">
                    共 {blacklistedUsers.length} 人
                  </span>
                </div>

                {blacklistedUsers.length === 0 ? (
                  <div className="cb-selection-banner bl-empty">目前黑名單是空的。</div>
                ) : (
                  <div className="cb-table-wrap bl-table-wrap">
                    <table className="cb-table bl-table">
                      <thead>
                        <tr>
                          <th>使用者名稱</th>
                          <th>學號 / 帳號</th>
                          <th>信箱</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blacklistedUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{(u.first_name || "") + (u.last_name || "") || "—"}</td>
                            <td>{u.username || "—"}</td>
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
