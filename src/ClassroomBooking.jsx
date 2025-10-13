import React, { useState } from "react";
import "./App.css";

export default function ClassroomBooking() {
  const [showLogin, setShowLogin] = useState(false);

  const classrooms = [
    "A203", "A204", "A205",
    "A206 - 電腦教室-1", "A207 - 視聽教室", "A208 - 電腦教室-2",
    "A209", "A210", "A211",
    "A301 - 會議室", "A302 - 會議室", "A303", "A306",
    "B218",
    "B223 - 會議室-大", "B226 - 會議室-小",
    "B323 - 會議室-大", "B326 - 會議室-小",
  ];

  // 假登入事件（之後可換成呼叫 API）
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const account = form.get("account");
    const password = form.get("password");
    console.log("login ->", account, password);
    // TODO: 呼叫後端驗證，成功後關閉登入
    setShowLogin(false);
    alert("（範例）已送出登入，請接上你的 API 驗證邏輯。");
  };

  return (
    <div className="cb-root">
      {/* 左側側欄 */}
      <aside className="cb-sidebar">
        <div className="cb-logo" />
        <div className="cb-tree-title">海大教室預約系統</div>
        <ul className="cb-tree">
          {classrooms.map((room) => (
            <li key={room} className="cb-tree-item">{room}</li>
          ))}
        </ul>
      </aside>

      {/* 右側主區域 */}
      <section className="cb-main">
        {/* 上方藍色漸層 + 右上登入/返回按鈕 */}
        <div className="cb-hero">
          <button
            className="cb-login-btn"
            onClick={() => setShowLogin((v) => !v)}
            aria-pressed={showLogin}
          >
            {showLogin ? "返回" : "登入"}
          </button>
        </div>

        {/* 中央卡片：根據狀態切換內容 */}
        <div className="cb-card">
          {showLogin ? (
            <>
              <h1 className="cb-card-title">登入系統</h1>
              <form className="login-inline" onSubmit={handleLoginSubmit}>
                <div className="form-row">
                  <label htmlFor="account">帳號</label>
                  <input id="account" name="account" type="text" required placeholder="請輸入帳號" />
                </div>
                <div className="form-row">
                  <label htmlFor="password">密碼</label>
                  <input id="password" name="password" type="password" required placeholder="請輸入密碼" />
                </div>
                <div className="form-actions">
                  <button type="button" className="cb-btn ghost" onClick={() => setShowLogin(false)}>
                    取消
                  </button>
                  <button type="submit" className="cb-btn">登入</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="cb-card-title">教室預約系統說明</h1>

              <div className="cb-section">
                <h2 className="cb-section-title">注意事項</h2>
                <ol className="cb-list">
                  <li>因班排或系外系學生不當利用而影響系館師生晚間安寧，為加強管理教室借用狀況，自104.5.1起晚間17:00後時段採行「紙本」申請借用，空間暫停線上預借，申請表需由導師或指導教授簽名後再送至系辦申請，請各同學配合，謝謝。</li>
                  <li>為維持教室使用效率，借用日期期限採現況或限期（例：僅開放借用當日+15天之教室）。</li>
                  <li>平日晚上時段(17:00後)借用2樓教室者，系辦會先行開門（僅舉例）。借用3樓教室者，請先至系辦拿鑰匙開門。</li>
                  <li>借用非上班日（包含星期六、日及固定同時段的教室），請填妥申請表，並將紙本申請表送交系辦（系學會活動需經系主任核後）待系主任核准後才能借用。—申請表下載</li>
                </ol>
              </div>

              <div className="cb-divider" />

              <div className="cb-section">
                <h2 className="cb-section-title">借用流程</h2>
                <ol className="cb-list">
                  <li>本系同學請以 portal 帳號連動登入。</li>
                  <li>進入系統後，先點選左側「教室列表」中欲預約的教室，畫面將顯示該教室當週使用情形。</li>
                  <li>再點選上方「預約教室」，填寫完整預借資料後送出。</li>
                  <li>回到「教室列表」確認教室預借紀錄已記錄，即完成預借。</li>
                  <li>非本系師生欲借用者，請先洽系辦。</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
