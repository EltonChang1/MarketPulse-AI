import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getPortfolioForUser } from "../context/portfolioStore";
import "../styles/briefings.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function BriefingsPage() {
  const { token, isAuthenticated, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/reports`, {
        params: { summary: "1" },
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(data.reports || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectReport(row) {
    setSelected(row);
    if (!token || !row?._id) return;
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/reports/${row._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.report) setSelected(data.report);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  }

  useEffect(() => {
    if (!token || !selected?._id || selected.status !== "pending") return undefined;
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/reports/${selected._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.report) {
          setSelected(data.report);
          if (data.report.status !== "pending") load();
        }
      } catch {
        // ignore transient errors while polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [token, selected?._id, selected?.status, load]);

  async function triggerGenerate(kind) {
    if (!token) return;
    setGenerating(true);
    setError("");
    try {
      const body =
        kind === "portfolio_snapshot"
          ? { kind, portfolioSnapshot: getPortfolioForUser(user) }
          : { kind: "watchlist_weekly" };
      await axios.post(`${API_BASE_URL}/api/reports/generate`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeout(load, 2000);
      setTimeout(load, 8000);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setGenerating(false);
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="briefings-page">
      <div className="briefings-header">
        <Link to="/" className="briefings-back">
          ← Home
        </Link>
        <h1>Research briefings</h1>
        <p className="briefings-sub">
          Background reports are generated on the server and stored for your account. Refresh the list after a few seconds.
        </p>
        <div className="briefings-actions">
          <button type="button" disabled={generating} onClick={() => triggerGenerate("watchlist_weekly")}>
            Generate watchlist brief
          </button>
          <button type="button" disabled={generating} onClick={() => triggerGenerate("portfolio_snapshot")}>
            Generate portfolio note
          </button>
          <button type="button" className="briefings-refresh" disabled={loading} onClick={load}>
            Refresh list
          </button>
        </div>
      </div>

      {error ? <div className="briefings-error">{error}</div> : null}

      <div className="briefings-layout">
        <aside className="briefings-list">
          {loading ? <p>Loading…</p> : null}
          {!loading && reports.length === 0 ? <p className="briefings-empty">No reports yet. Generate one above.</p> : null}
          <ul>
            {reports.map((r) => (
              <li key={r._id}>
                <button
                  type="button"
                  className={selected?._id === r._id ? "active" : ""}
                  onClick={() => selectReport(r)}
                >
                  <span className="briefings-kind">{r.kind}</span>
                  <span className="briefings-title">{r.title || r._id}</span>
                  <span className="briefings-meta">
                    {r.status} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <main className="briefings-detail">
          {!selected ? (
            <p className="briefings-placeholder">Select a report</p>
          ) : (
            <>
              <h2>{selected.title}</h2>
              <p className="briefings-status">
                Status: <strong>{selected.status}</strong>
                {selected.errorMessage ? ` — ${selected.errorMessage}` : ""}
              </p>
              <pre className="briefings-body">{selected.body || "(empty — may still be generating)"}</pre>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
