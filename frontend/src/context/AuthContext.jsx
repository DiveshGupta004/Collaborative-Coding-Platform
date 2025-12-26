import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const tryAutoLogin = async () => {
    try {
      const res = await api.get("/auth/refresh");
      setAccessToken(res.data.accessToken);

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
    tryAutoLogin();
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
