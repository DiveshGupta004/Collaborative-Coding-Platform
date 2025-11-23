import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true); // ⬅ prevents flicker

  const tryAutoLogin = async () => {
    try {
      const res = await api.get("/auth/refresh"); // 🔥 cookie is sent automatically
      setAccessToken(res.data.accessToken);

      // Get user details again
      const u = JSON.parse(localStorage.getItem("user"));
      if (u) setUser(u);
    } catch (err) {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = ({ user, accessToken }) => {
    setUser(user);
    setAccessToken(accessToken);
    localStorage.setItem("user", JSON.stringify(user));
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch {}
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("user");
  };

  useEffect(() => {
    tryAutoLogin(); // 🔥 restore login on page load
  }, []);

  if (loading) return null; // prevents temporary logout flash

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
