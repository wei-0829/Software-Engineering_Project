import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./ProfilePage.css";
import { API_ENDPOINTS } from "./config/api.js";
import { useAuth } from "./useAuth";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { account, user, isAdmin, refreshAccessToken, logout } = useAuth();

  // --- 基本顯示資料（先用 useAuth 帶進來） ---
  const roleLabel = useMemo(() => (isAdmin ? "管理員" : "一般使用者"), [isAdmin]);

  // --- 使用者名稱編輯 ---
  const [editNameMode, setEditNameMode] = useState(false);
  const [displayName, setDisplayName] = useState(user || "");
  const [savingName, setSavingName] = useState(false);

  // --- 密碼修改 ---
  const [editPwdMode, setEditPwdMode] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  // 未登入就踢回登入（因為一般使用者也能改，但要登入）
  useEffect(() => {
    if (!account) {
      alert("請先登入後再修改個人資料");
      navigate("/login");
    }
  }, [account, navigate]);

  // 如果 useAuth 的 user 更新了，同步顯示名稱
  useEffect(() => {
    setDisplayName(user || "");
  }, [user]);

  // ============ 你之後要接後端的地方（先保留接口） ============
  // 1) 更新使用者名稱（PATCH）
  const saveDisplayName = async () => {
    if (!displayName.trim()) {
      alert("使用者名稱不能為空");
      return;
    }

    setSavingName(true);

    // ✅ 你之後把 API_ENDPOINTS.profile() / API_ENDPOINTS.updateMe() 換成你後端實際的路由
    // 這裡先用一個「安全的佔位寫法」：如果沒有 endpoint，就只做前端提示
    const endpoint =
      API_ENDPOINTS?.profile?.() ||
      API_ENDPOINTS?.me?.() ||
      API_ENDPOINTS?.usersMe?.();

    // 沒 endpoint：先當作 UI 完成
    if (!endpoint) {
      setTimeout(() => {
        setSavingName(false);
        setEditNameMode(false);
        alert("（前端完成）之後接上後端 API 即可真正儲存名稱");
      }, 300);
      return;
    }

    const makeRequest = async (accessToken) =>
      fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: displayName.trim() }),
      });

    try {
      let token = localStorage.getItem("access_token");
      let res = await makeRequest(token);

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          alert("登入已過期，請重新登入");
          logout();
          navigate("/login");
          return;
        }
        res = await makeRequest(newToken);
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "更新使用者名稱失敗");

      setEditNameMode(false);
      alert("使用者名稱已更新");
    } catch (e) {
      alert(e.message || "更新失敗");
    } finally {
      setSavingName(false);
    }
  };

  // 2) 修改密碼（PATCH / POST）
  const savePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      alert("請完整填寫舊密碼與新密碼");
      return;
    }
    if (newPwd.length < 6) {
      alert("新密碼至少 6 碼");
      return;
    }
    if (newPwd !== confirmPwd) {
      alert("新密碼與確認新密碼不一致");
      return;
    }

    setSavingPwd(true);

    // ✅ 你之後把 API_ENDPOINTS.changePassword() 換成你後端實際路由
    const endpoint =
      API_ENDPOINTS?.changePassword?.() ||
      API_ENDPOINTS?.password?.() ||
      API_ENDPOINTS?.mePassword?.();

    if (!endpoint) {
      setTimeout(() => {
        setSavingPwd(false);
        setEditPwdMode(false);
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
        alert("（前端完成）之後接上後端 API 即可真正修改密碼");
      }, 300);
      return;
    }

    const makeRequest = async (accessToken) =>
      fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          current_password: currentPwd,
          new_password: newPwd,
        }),
      });

    try {
      let token = localStorage.getItem("access_token");
      let res = await makeRequest(token);

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          alert("登入已過期，請重新登入");
          logout();
          navigate("/login");
          return;
        }
        res = await makeRequest(newToken);
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "修改密碼失敗");

      alert("密碼已更新，請重新登入");
      logout();
      navigate("/login");
    } catch (e) {
      alert(e.message || "修改失敗");
    } finally {
      setSavingPwd(false);
    }
  };

  if (!account) return null;

  return (
    <div className="cb-root">
      <section className="cb-main" style={{ width: "100%" }}>
        {/* 上方右側按鈕 */}
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

        {/* 中間卡片 */}
        <div className="cb-card">
          <h1 className="cb-card-title">修改個人資料</h1>

          <div className="cb-section">
            <h2 className="cb-section-title">帳號資訊</h2>

            <div className="profile-grid">
              {/* 身分 */}
              <div className="profile-row">
                <div className="profile-label">身分</div>
                <div className="profile-value">
                  <span className={"role-pill " + (isAdmin ? "is-admin" : "is-user")}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* 使用者名稱 */}
              <div className="profile-row">
                <div className="profile-label">使用者名稱</div>

                <div className="profile-value profile-actions">
                  {!editNameMode ? (
                    <>
                      <div className="profile-text">{displayName || "（未設定）"}</div>
                      <button
                        className="cb-btn profile-btn"
                        onClick={() => setEditNameMode(true)}
                      >
                        修改
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        className="profile-input"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="輸入新的使用者名稱"
                      />
                      <button
                        className="cb-btn profile-btn"
                        disabled={savingName}
                        onClick={saveDisplayName}
                      >
                        {savingName ? "儲存中..." : "儲存"}
                      </button>
                      <button
                        className="cb-btn profile-btn danger"
                        disabled={savingName}
                        onClick={() => {
                          setEditNameMode(false);
                          setDisplayName(user || "");
                        }}
                      >
                        取消
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 帳號 */}
              <div className="profile-row">
                <div className="profile-label">帳號</div>
                <div className="profile-value">
                  <div className="profile-text mono">{account}</div>
                  <div className="profile-hint">（帳號不可修改）</div>
                </div>
              </div>

              {/* 密碼（遮起來） */}
              <div className="profile-row">
                <div className="profile-label">密碼</div>
                <div className="profile-value profile-actions">
                  <div className="profile-text mono">••••••••••••</div>

                  {!editPwdMode ? (
                    <button
                      className="cb-btn profile-btn"
                      onClick={() => setEditPwdMode(true)}
                    >
                      修改密碼
                    </button>
                  ) : (
                    <button
                      className="cb-btn profile-btn danger"
                      onClick={() => {
                        setEditPwdMode(false);
                        setCurrentPwd("");
                        setNewPwd("");
                        setConfirmPwd("");
                      }}
                    >
                      取消修改
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 修改密碼展開區 */}
            {editPwdMode && (
              <div className="pwd-panel">
                <div className="pwd-title">修改密碼</div>

                <div className="pwd-grid">
                  <div className="pwd-item">
                    <label className="pwd-label">舊密碼</label>
                    <input
                      type="password"
                      className="pwd-input"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder="輸入舊密碼"
                    />
                  </div>

                  <div className="pwd-item">
                    <label className="pwd-label">新密碼</label>
                    <input
                      type="password"
                      className="pwd-input"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="輸入新密碼（至少 6 碼）"
                    />
                  </div>

                  <div className="pwd-item">
                    <label className="pwd-label">確認新密碼</label>
                    <input
                      type="password"
                      className="pwd-input"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="再次輸入新密碼"
                    />
                  </div>

                  <div className="pwd-actions">
                    <button
                      className="cb-btn"
                      disabled={savingPwd}
                      onClick={savePassword}
                    >
                      {savingPwd ? "儲存中..." : "確認修改密碼"}
                    </button>
                  </div>
                </div>

                <div className="pwd-note">
                  修改密碼成功後，建議重新登入以確保安全。
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部藍色 Banner */}
        <div className="editing-footer">
          <span>海大教室預約系統</span>
        </div>
      </section>
    </div>
  );
}
