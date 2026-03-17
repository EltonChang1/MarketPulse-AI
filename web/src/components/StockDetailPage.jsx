import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import StockDetailView from "./StockDetailView";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch only when authenticated
  useEffect(() => {
    if (!symbol || !isAuthenticated) return;
    setLoading(true);
    setError("");
    setStockData(null);

    axios
      .get(`${API_BASE_URL}/api/analyze/${symbol.toUpperCase()}`, {
        params: { markers: 10, perIndicator: 3 },
      })
      .then(({ data }) => {
        setStockData(data);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err.message || "Failed to load stock data.");
      })
      .finally(() => setLoading(false));
  }, [symbol, isAuthenticated]);

  // Wait for auth to resolve before deciding
  if (authLoading) {
    return (
      <div className="stock-page-state">
        <div className="stock-page-spinner" />
      </div>
    );
  }

  // Redirect guests to sign up
  if (!isAuthenticated) {
    return <Navigate to="/signup" replace />;
  }

  if (loading) {
    return (
      <div className="stock-page-state">
        <div className="stock-page-spinner" />
        <p>Loading analysis for <strong>{symbol?.toUpperCase()}</strong>…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stock-page-state stock-page-error">
        <p>⚠️ {error}</p>
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <StockDetailView
      stock={stockData}
      onBack={() => navigate("/")}
    />
  );
}
