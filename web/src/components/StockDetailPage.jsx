import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import StockDetailView from "./StockDetailView";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const normalizedSymbol = decodeURIComponent(String(symbol || "")).toUpperCase();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!normalizedSymbol) return;
    setLoading(true);
    setError("");
    setStockData(null);

    axios
      .get(`${API_BASE_URL}/api/analyze/${encodeURIComponent(normalizedSymbol)}`, {
        params: { markers: 10, perIndicator: 3 },
      })
      .then(({ data }) => {
        setStockData(data);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err.message || "Failed to load stock data.");
      })
      .finally(() => setLoading(false));
  }, [normalizedSymbol]);

  if (loading) {
    return (
      <div className="stock-page-state">
        <div className="stock-page-spinner" />
        <p>Loading analysis for <strong>{normalizedSymbol}</strong>…</p>
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
