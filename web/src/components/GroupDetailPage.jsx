import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGroup, getGroupLeaderboard, leaveGroup } from "../lib/portfolioApi";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import "../styles/dashboard.css";

function formatCurrency(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function formatPercent(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return "-";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [g, b] = await Promise.all([
        getGroup(token, groupId),
        getGroupLeaderboard(token, groupId),
      ]);
      setGroup(g);
      setBoard(b);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, groupId]);

  async function handleLeave() {
    try {
      await leaveGroup(token, groupId);
      navigate("/groups");
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="portfolio-page">
        <p>Loading…</p>
      </div>
    );
  }
  if (error && !group) {
    return (
      <div className="portfolio-page">
        <p style={{ color: "#fb7185" }}>{error}</p>
      </div>
    );
  }
  if (!group) return null;

  const isOwner = group.ownerId === user?.id;

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <h1>{group.name}</h1>
          <p>{group.description || "No description"}</p>
          <small>
            Invite code: <code>{group.inviteCode}</code> · {group.members.length} member
            {group.members.length !== 1 ? "s" : ""}
            {isOwner ? " · You own this group" : ""}
          </small>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" onClick={() => navigate("/groups")}>
            ← Groups
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          {!isOwner ? (
            <Button variant="outline" onClick={handleLeave}>
              Leave
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div style={{ color: "#fb7185", marginBottom: 12 }}>{error}</div>
      ) : null}

      <Card className="portfolio-card">
        <CardContent className="p-5">
          <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
          <p style={{ opacity: 0.7 }}>
            Ranked by total return %.{" "}
            {board?.generatedAt
              ? `Generated at ${new Date(board.generatedAt).toLocaleTimeString()}.`
              : ""}
          </p>
          <div className="portfolio-table-wrap">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Cost</th>
                  <th>Value</th>
                  <th>Gain</th>
                  <th>Return %</th>
                  <th>Top Holding</th>
                </tr>
              </thead>
              <tbody>
                {board?.leaderboard?.map((row) => (
                  <tr key={row.userId}>
                    <td>{row.rank}</td>
                    <td>
                      {row.username}
                      {row.userId === user?.id ? " (you)" : ""}
                    </td>
                    <td>{formatCurrency(row.totalCost)}</td>
                    <td>{formatCurrency(row.currentValue)}</td>
                    <td className={row.gain >= 0 ? "positive" : "negative"}>
                      {formatCurrency(row.gain)}
                    </td>
                    <td className={row.returnPct >= 0 ? "positive" : "negative"}>
                      {formatPercent(row.returnPct)}
                    </td>
                    <td>
                      {row.topHolding ? (
                        <Badge>{row.topHolding}</Badge>
                      ) : (
                        <span style={{ opacity: 0.5 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {board?.leaderboard?.every((r) => !r.hasPortfolio) ? (
            <p style={{ opacity: 0.7, marginTop: 12 }}>
              No member has added a transaction yet. Visit your Portfolio page to add some.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
