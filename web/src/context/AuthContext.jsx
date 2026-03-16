import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("marketpulse_token");
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function verifyToken(tk) {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      setUser(data.user);
      setToken(tk);
    } catch (error) {
      console.warn("Token verification failed, clearing auth");
      localStorage.removeItem("marketpulse_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signup(email, password, firstName, lastName) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        email,
        password,
        firstName,
        lastName,
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("marketpulse_token", data.token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async function signin(email, password) {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
        email,
        password,
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("marketpulse_token", data.token);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("marketpulse_token");
  }

  async function addToWatchlist(symbol) {
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/watchlist/add`,
        { symbol },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser((prev) => (prev ? { ...prev, watchlist: data.watchlist } : null));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async function removeFromWatchlist(symbol) {
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const { data } = await axios.delete(
        `${API_BASE_URL}/api/watchlist/remove/${symbol}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser((prev) => (prev ? { ...prev, watchlist: data.watchlist } : null));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signup,
        signin,
        logout,
        addToWatchlist,
        removeFromWatchlist,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
