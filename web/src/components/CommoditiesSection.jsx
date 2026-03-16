import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function CommoditiesSection({ onSelectStock }) {
  const [commodities, setCommodities] = useState([]);
  const [etfs, setETFs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/commodities-etfs`);
        setCommodities(data.commodities || []);
        setETFs(data.etfs || []);
      } catch (error) {
        console.error("Failed to fetch commodities/ETFs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="commodities-section">
        <div className="section-loading">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="commodities-section">
      <div className="commodities-header">
        <h2>📈 Market Overview</h2>
        <p>Track essential commodities and market indices</p>
      </div>

      {/* Commodities */}
      <div className="commodities-subsection">
        <h3>💰 Commodities & Indices</h3>
        <div className="market-grid">
          {commodities.map((item) => (
            <div
              key={item.symbol}
              className="market-card"
              onClick={() => onSelectStock(item.symbol)}
              role="button"
              tabIndex={0}
            >
              <div className="market-card-header">
                <div className="market-symbol">{item.symbol}</div>
                <span className="market-type">{item.type}</span>
              </div>
              <div className="market-name">{item.name}</div>
              <button className="market-card-btn">View Analysis →</button>
            </div>
          ))}
        </div>
      </div>

      {/* ETFs */}
      <div className="commodities-subsection">
        <h3>📊 Popular ETFs</h3>
        <div className="market-grid">
          {etfs.map((item) => (
            <div
              key={item.symbol}
              className="market-card"
              onClick={() => onSelectStock(item.symbol)}
              role="button"
              tabIndex={0}
            >
              <div className="market-card-header">
                <div className="market-symbol">{item.symbol}</div>
                <span className="market-type">{item.type}</span>
              </div>
              <div className="market-name">{item.name}</div>
              <button className="market-card-btn">View Analysis →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
