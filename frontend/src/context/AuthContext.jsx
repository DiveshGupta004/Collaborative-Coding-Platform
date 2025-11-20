import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // 🔹 LOGIN — Save user + token securely
  const login = ({ user, accessToken }) => {
    setUser(user);
    setAccessToken(accessToken);

    // store only user, not token
    localStorage.setItem("user", JSON.stringify(user));
  };

  // 🔹 LOGOUT — delete everything
  const logout = async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch (err) {}

    setUser(null);
    setAccessToken(null);

    localStorage.removeItem("user");
  };

  // 🔹 Auto-load user on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
