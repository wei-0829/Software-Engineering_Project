import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

export default function Login() {
  const [view, setView] = useState("login"); // login | register | forgot
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmitLogin = (e) => {
    e.preventDefault();
    console.log("login ->", { account, password });
    // TODO: 呼叫後端驗證，成功後導回首頁
    navigate("/");
  };

  const onSubmitRegister = (e) => {
    e.preventDefault();
    // TODO: 呼叫註冊 API
    alert("（範例）已送出註冊資料");
    setView("login");
  };

  const onSubmitForgot = (e) => {
    e.preventDefault();
    // TODO: 呼叫忘記密碼 API
    alert("（範例）已送出重設密碼要求");
    setView("login");
  };

  return (
    <div className="login-page">
      <header className="login-topbar">
        <div className="login-brand">海大教室預約系統</div>
        <button className="cb-btn ghost" onClick={() => navigate("/")}>
          返回首頁
        </button>
      </header>

      <main className="login-container">
        <div className="login-panel">
          {/* 左：依 view 切換表單 */}
          <section className="login-left">
            {view === "login" && (
              <>
                <h2 className="login-title">登入 Portal</h2>
                <form className="login-form" onSubmit={onSubmitLogin}>
                  <label className="login-label">帳號</label>
                  <input
                    className="login-input"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="請輸入帳號"
                    required
                  />

                  <label className="login-label">密碼</label>
                  <input
                    className="login-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="請輸入密碼"
                    required
                  />

                  <label className="login-remember">
                    <input type="checkbox" /> 記住我？
                  </label>

                  <div className="login-captcha">我是 reCAPTCHA 佔位</div>

                  <button type="submit" className="cb-btn" style={{ alignSelf: "flex-start" }}>
                    登入 Portal
                  </button>
                </form>
              </>
            )}

            {view === "register" && (
              <>
                <h2 className="login-title">註冊新帳號</h2>
                <form className="login-form" onSubmit={onSubmitRegister}>
                  <label className="login-label">姓名</label>
                  <input className="login-input" type="text" placeholder="請輸入姓名" required />

                  <label className="login-label">學校帳號</label>
                  <input className="login-input" type="text" placeholder="請輸入學校帳號" required />

                  <label className="login-label">密碼</label>
                  <input className="login-input" type="password" placeholder="請輸入密碼" required />

                  <div className="form-actions" style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="cb-btn ghost" onClick={() => setView("login")}>
                      返回登入
                    </button>
                    <button type="submit" className="cb-btn">註冊</button>
                  </div>
                </form>
              </>
            )}

            {view === "forgot" && (
              <>
                <h2 className="login-title">忘記密碼</h2>
                <form className="login-form" onSubmit={onSubmitForgot}>
                  <label className="login-label">輸入學校帳號</label>
                  <input className="login-input" type="text" placeholder="請輸入學校帳號" required />

                  <div className="form-actions" style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="cb-btn ghost" onClick={() => setView("login")}>
                      返回登入
                    </button>
                    <button type="submit" className="cb-btn">送出</button>
                  </div>
                </form>
              </>
            )}
          </section>

          {/* 右：快捷選單（用 button，不跳頁） */}
          <aside className="login-right">
            <button type="button" className="login-link" onClick={() => setView("forgot")}>
              忘記密碼
            </button>
            <button type="button" className="login-link" onClick={() => setView("register")}>
              註冊新帳號
            </button>
            <a
              className="login-link"
              href="https://www.ntou.edu.tw/"
              target="_blank"
              rel="noopener noreferrer"
            >
              國立臺灣海洋大學
            </a>
          </aside>
        </div>

        {/* 底部資訊 */}
        <section className="login-notes">
          <ol>
            <li>新使用者請先註冊帳號後再登入。</li>
            <li>忘記密碼請點擊「忘記密碼」依指示操作。</li>
            <li>建議使用最新版瀏覽器以獲得最佳體驗。</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
