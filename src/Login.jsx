import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import './Login.css';

/*
  Login.jsx  
  功能：登入 / 註冊 / 忘記密碼頁面  
  - 前端呼叫 Django 後端 API：/api/auth/login/、/api/auth/register/
  - 使用 JWT（登入後存 access_token / refresh_token）
*/

/*
  Login.jsx  
  功能：登入 / 註冊 / 忘記密碼頁面  
  - 前端呼叫 Django 後端 API：/api/auth/login/、/api/auth/register/
  - 使用 JWT（登入後存 access_token / refresh_token）
*/

export default function Login() {
  // 控制左側顯示哪一個表單(login / register / forgot)
  const [view, setView] = useState("login");

  // login 表單欄位（帳號 / 密碼）
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  /* -----------------------------
      1. 登入 API 呼叫
     ----------------------------- */
  const onSubmitLogin = async (e) => {
    e.preventDefault();

    try {
      // POST /api/auth/login/
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // 後端需要 { account, password }
        body: JSON.stringify({ account, password }),
      });

      if (!res.ok) {
        // 例如：帳號或密碼錯誤
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "登入失敗");
        return;
      }

      // 後端會回傳 access / refresh / user
      const data = await res.json();
      console.log("login success:", data);

      // 儲存 JWT token & 使用者資訊到 localStorage（前端登入狀態）
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));

      // 導回首頁
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("無法連線到伺服器");
    }
  };


  /* -----------------------------
      2. 註冊 API 呼叫
     ----------------------------- */
  const onSubmitRegister = async (e) => {
    e.preventDefault();

    // 直接從 form 裡抓三個欄位：姓名 / 帳號 / 密碼
    const form = e.target;
    const name = form.elements[0].value;
    const account = form.elements[1].value;
    const password = form.elements[2].value;

    try {
      // POST /api/auth/register/
      const res = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // 後端需要 { name, account, password }
        body: JSON.stringify({ name, account, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("註冊失敗：" + JSON.stringify(err));
        return;
      }

      alert("註冊成功，請用帳號登入");
      setView("login"); // 顯示登入表單
    } catch (err) {
      console.error(err);
      alert("無法連線到伺服器");
    }
  };


  /* -----------------------------
      3. 忘記密碼（目前僅範例）
     ----------------------------- */
  const onSubmitForgot = (e) => {
    e.preventDefault();
    alert("（範例）已送出重設密碼要求");
    setView("login");
  };

  /* -----------------------------
      4. 畫面顯示：依 view 切換三種表單
     ----------------------------- */
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

          {/* 左側表單區域 */}
          <section className="login-left">

            {/* ----------------- Login 表單 ----------------- */}
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

                  {/* 尚未實作的 reCAPTCHA 區塊 */}
                  <div className="login-captcha">我是 reCAPTCHA 佔位</div>

                  <button type="submit" className="cb-btn" style={{ alignSelf: "flex-start" }}>
                    登入 Portal
                  </button>
                </form>
              </>
            )}

            {/* ----------------- Register 表單 ----------------- */}
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

            {/* ----------------- Forgot Password 表單 ----------------- */}
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

          {/* 右側快速選單 */}
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

        {/* 底部說明 */}
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
