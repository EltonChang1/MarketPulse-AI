import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listMyGroups, createGroup, joinGroup } from "../lib/portfolioApi";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import "../styles/dashboard.css";

export default function GroupsPage() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await listMyGroups(token);
        if (!cancelled) setGroups(data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated]);

  async function handleCreate() {
    if (!newName.trim()) return setError("Group name required");
    setLoading(true);
    setError("");
    try {
      const g = await createGroup(token, {
        name: newName,
        description: newDesc,
        visibility: "private",
      });
      setGroups((prev) => [g, ...prev]);
      setNewName("");
      setNewDesc("");
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return setError("Invite code required");
    setLoading(true);
    setError("");
    try {
      const g = await joinGroup(token, inviteCode.trim());
      setGroups((prev) => (prev.some((x) => x.id === g.id) ? prev : [g, ...prev]));
      setInviteCode("");
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="portfolio-page">
        <p>Please sign in to view investment groups.</p>
      </div>
    );
  }

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    marginBottom: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 6,
    background: "transparent",
    color: "inherit",
    fontSize: 14,
  };

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <h1>Investment Groups</h1>
          <p>Compete with friends and classmates. Rankings update with live market prices.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          ← Back to Dashboard
        </Button>
      </div>

      {error ? (
        <div style={{ color: "#fb7185", marginBottom: 12 }}>{error}</div>
      ) : null}

      <section className="portfolio-grid-top" style={{ gap: 16 }}>
        <Card className="portfolio-card">
          <CardContent className="p-5">
            <h3>Create a group</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
              style={inputStyle}
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              style={inputStyle}
            />
            <Button disabled={loading} onClick={handleCreate}>
              Create
            </Button>
          </CardContent>
        </Card>

        <Card className="portfolio-card">
          <CardContent className="p-5">
            <h3>Join with invite code</h3>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              style={inputStyle}
            />
            <Button disabled={loading} onClick={handleJoin}>
              Join
            </Button>
          </CardContent>
        </Card>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>My groups</h2>
        {groups.length === 0 ? (
          <p style={{ opacity: 0.7 }}>
            You haven't joined any groups yet. Create one or join with an invite code above.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {groups.map((g) => (
              <Card
                key={g.id}
                className="portfolio-card"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <CardContent className="p-5">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{g.name}</h3>
                      <p style={{ opacity: 0.7, margin: "4px 0" }}>
                        {g.description || "No description"}
                      </p>
                      <small>
                        {g.members.length} member{g.members.length !== 1 ? "s" : ""} · Invite code:{" "}
                        <code>{g.inviteCode}</code>
                      </small>
                    </div>
                    <Button variant="outline">View →</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
