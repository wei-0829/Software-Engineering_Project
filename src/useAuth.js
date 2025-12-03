import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "./config/api.js";

/**
 * 解析 JWT token 的輔助函數
 * @param {string} token
 * @returns {object | null}
 */
function parseJwt(token) {
  if (!token) return null;
  try {
    // 將 token 的第二部分 (payload) 解碼
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    console.error("Failed to parse JWT:", e);
    return null;
  }
}

/**
 * 管理使用者認證狀態的 custom hook
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const [account, setAccount] = useState(() => localStorage.getItem("username"));
  const [user, setUser] = useState(() => localStorage.getItem("name"));
  const [isAdmin, setIsAdmin] = useState(() => {
    const token = localStorage.getItem("access_token");
    return parseJwt(token)?.is_staff || false;
  });

  // 監聽 localStorage 的變化，以便在不同分頁間同步登入/登出狀態
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("access_token");
      setAccount(localStorage.getItem("username"));
      setUser(localStorage.getItem("name"));
      setIsAdmin(parseJwt(token)?.is_staff || false);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // 登出函式
  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    // 觸發狀態更新
    setAccount(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  // 刷新 token 的輔助函數
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      const res = await fetch(API_ENDPOINTS.refresh(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!res.ok) throw new Error("Token refresh failed");

      const data = await res.json();
      if (data.access) {
        localStorage.setItem("access_token", data.access);
        return data.access;
      }
      return null;
    } catch (error) {
      console.error("Token refresh error:", error);
      // 如果刷新失敗，可能是 refresh token 也過期了，直接登出
      logout();
      navigate("/login");
      return null;
    }
  }, [logout, navigate]);

  return { account, user, isAdmin, logout, refreshAccessToken };
};
