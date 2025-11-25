import { useState, useRef,useEffect} from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./Login.css";

/*
  Login.jsx  
  功能：登入 / 註冊 / 忘記密碼頁面  
  - 前端呼叫 Django 後端 API：/api/auth/login/、/api/auth/register/
  - 使用 JWT（登入後存 access_token / refresh_token）
*/

export default function Login() {
  const [view, setView] = useState("login");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCooldown, setVerifyCooldown] = useState(0);
  const registerNameRef = useRef(null);
  const registerAccountRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
  if (verifyCooldown <= 0) return;
  const timer = setInterval(() => {
    setVerifyCooldown((s) => (s > 0 ? s - 1 : 0));
  }, 1000);
  return () => clearInterval(timer);
}, [verifyCooldown]);

  /* -----------------------------
      1. 登入 API 呼叫
     ----------------------------- */
  const onSubmitLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account, password }),
      });
      //alert(res)
      if (!res.ok) {
        const { detail } = await res.json().catch(() => ({}));
        alert(detail || "登入失敗，請確認帳號密碼");
        return;
      }

      const data = await res.json();
      console.log("login success:", data);

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
       localStorage.setItem("username", account);

      navigate("/");
    } catch (err) {
      console.error("sd");
      alert("無法連線到伺服器");
    }
  };

  /* -----------------------------
      2. 註冊 API 呼叫
     ----------------------------- */
  const onSubmitRegister = async (e) => {
    e.preventDefault();

    // 從 form 拿三個欄位（用 name 會比用 index 穩）
    const form = e.target;
    const name = form.elements["name"].value;
    const account = form.elements["account"].value;
    const password = form.elements["password"].value;
    const code = form.elements["code"]?.value;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, account, password, code }),
      });

      if (!res.ok) {
        const { detail } = await res.json().catch(() => ({}));
        alert(detail ? `註冊失敗：${detail}` : "註冊失敗");
        return;
      }

      alert("註冊成功，請用帳號登入");
      setView("login");
    } catch (err) {
      console.error(err);
      alert("無法連線到伺服器");
    }
  };

  const onSubmitValidation = async (accountValue) => {
    const account =
      (accountValue ?? registerAccountRef.current?.value ?? "").trim();

    if (!account) {
      alert("請先輸入姓名與學校帳號");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/send_verification/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });

      if (!res.ok) {
        const {detail} = await res.json().catch(() => ({}));
        alert(detail || "驗證碼寄送失敗，請稍後再試");
        if(detail=="嘗試次數過多，請重新寄送驗證碼"){
          setVerifyCooldown(0);
        }
        return;

      }
      setVerifyCooldown(300);
      alert("驗證碼已寄出，請到信箱查收");
    } catch (err) {
      console.error(err);
      alert(err);
    }
  };

  /* -----------------------------
      3. 忘記密碼
     ----------------------------- */
  const onSubmitForgot = async (accountValue) => {
    const account =
      (accountValue ?? registerAccountRef.current?.value ?? "").trim();

    if (!account) {
      alert("請先輸入姓名與學校帳號");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/send_change_pwd/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });

      if (!res.ok) {
        const {detail} = await res.json().catch(() => ({}));
        alert(detail || "驗證碼寄送失敗，請稍後再試");
        return;

      }
      setVerifyCooldown(300);
      alert("驗證碼已寄出，請到信箱查收");
    } catch (err) {
      console.error(err);
      alert(err);
    }
  };

  const onSubmitNewPassword = async (e) => {
    e.preventDefault();
    const form = e.target;
    const account = form.elements["account"].value;
    const password = form.elements["password"].value;
    const password_check=form.elements["password_check"].value
    const code = form.elements["code"].value;

    if (!account || !password || !code) {
      alert("請填寫帳號、驗證碼、新密碼");
      return;
    }
    if(password!=password_check){
      alert("兩次輸入密碼不同")
        return
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/verify_change_pwd/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({  account, password, code }),
      });

      if (!res.ok) {
        const { detail } = await res.json().catch(() => ({}));
        alert(detail ? `${detail}` : "更改失敗");
        if(detail=="嘗試次數過多，請重新寄送驗證碼"){
          setVerifyCooldown(0);
        }
        return;
      }

      alert("更改成功，請用新帳號登入");
      setView("login");
    } catch (err) {
      console.error(err);
      alert("無法連線到伺服器");
    }
  };

  /* -----------------------------
      4. 畫面顯示
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
            {/* Login 表單 */}
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

                  <button
                    type="submit"
                    className="cb-btn"
                    style={{ alignSelf: "flex-start" }}
                  >
                    登入 Portal
                  </button>
                </form>
              </>
            )}

            {/* Register 表單 */}
            {view === "register" && (
              <>
                <h2 className="login-title">註冊新帳號</h2>

                <form className="login-form" onSubmit={onSubmitRegister}>
                  <label className="login-label">姓名</label>
                  <input
                    className="login-input"
                    type="text"
                    name="name"
                    ref={registerNameRef}
                    placeholder="請輸入姓名"
                    required
                  />

                  <label className="login-label">學校帳號</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="login-input"
                        type="text"
                        name="account"
                        ref={registerAccountRef}
                        placeholder="請輸入學校帳號"
                        onChange={() => setVerifyCooldown(0)}
                        required
                      />
                      <button
                        id="validationbtn"
                        type="button"
                        className="cb-btn ghost"
                        onClick={() =>
                          onSubmitValidation(
                            registerAccountRef.current?.value,
                            registerNameRef.current?.value
                          )
                        }
                        disabled={verifyCooldown > 0}
                        style={
                          verifyCooldown > 0
                            ? {
                                backgroundColor: "#ccc",
                                color: "#555",
                                borderColor: "#aaa",
                              }
                            : undefined
                        }
                      >
                        {verifyCooldown > 0 ? `${verifyCooldown}s` : "發送驗證碼"}
                      </button>
                    </div>
                        
                  <label className="login-label">密碼</label>
                  <input
                    className="login-input"
                    type="password"
                    name="password"
                    placeholder="請輸入密碼"
                    required
                  />

                  <label className="login-label">驗證碼</label>
                  <input
                    className="login-input"
                    type="text"
                    name="code"
                    placeholder="請輸入驗證碼"
                    required
                    style={{ flex: 1 }}
                  />
                  
                  <div
                    className="form-actions"
                    style={{ display: "flex", gap: 8 }}
                  >
                    <button
                      type="button"
                      className="cb-btn ghost"
                      onClick={() => setView("login")}
                    >
                      返回登入
                    </button>
                    <button type="submit" className="cb-btn">
                      註冊
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Forgot Password 表單 */}
            {view === "forgot" && (
              <>
                <h2 className="login-title">忘記密碼</h2>
                <form className="login-form" onSubmit={onSubmitNewPassword}>
                  {/* 1. 帳號 */}
                  <label className="login-label">輸入學校帳號</label>
                  <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="login-input"
                    type="text"
                    name="account"
                    ref={registerAccountRef}
                    onChange={() => setVerifyCooldown(0)}
                    placeholder="請輸入學校帳號"
                    required
                  />
                  <button
                        id="validationbtn"
                        type="button"
                        className="cb-btn ghost"
                        onClick={() =>
                          onSubmitForgot(
                            registerAccountRef.current?.value,
                            registerNameRef.current?.value
                          )
                        }
                        disabled={verifyCooldown > 0}
                        style={
                          verifyCooldown > 0
                            ? {
                                backgroundColor: "#ccc",
                                color: "#555",
                                borderColor: "#aaa",
                              }
                            : undefined
                        }
                      >
                        {verifyCooldown > 0 ? `${verifyCooldown}s` : "發送驗證碼"}
                      </button>
                      </div>
                  {/* 2. 驗證碼 + 發送按鈕 */}
                  <label className="login-label">驗證碼</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="login-input"
                      type="text"
                      name="code"
                      placeholder="請輸入驗證碼"
                      required
                      style={{ flex: 1 }}
                    />
                  </div>

                  {/* 3. 新密碼 & 確認新密碼 */}
                  <label className="login-label">新密碼</label>
                  <input
                    className="login-input"
                    type="password"
                    name="password"
                    placeholder="請輸入新密碼"
                    required
                  />

                  <label className="login-label">確認新密碼</label>
                  <input
                    className="login-input"
                    type="password"
                    name="password_check"
                    placeholder="請再次輸入新密碼"
                    required
                  />

                  {/* 4. 按鈕區塊 */}
                  <div className="form-actions" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" className="cb-btn ghost" onClick={() => {setView("login")}}>
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
            <button
              type="button"
              className="login-link"
              onClick={() => {setVerifyCooldown(0);setView("forgot")}}
            >
              忘記密碼
            </button>
            <button
              type="button"
              className="login-link"
              onClick={() => {setVerifyCooldown(0);setView("register")}}
            >
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




