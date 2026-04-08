import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { SignUpAuthShell } from "./ui/sign-in-flow-1";

export default function SignInPage() {
  const { signin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password required");
      return;
    }

    setLoading(true);
    const result = await signin(email, password);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <SignUpAuthShell title="Welcome back" subtitle="Sign in to MarketPulse AI">
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label htmlFor="si-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
            Email
          </label>
          <input
            id="si-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm text-white placeholder:text-white/35 backdrop-blur-[1px] focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          />
        </div>

        <div>
          <label htmlFor="si-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
            Password
          </label>
          <input
            id="si-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm text-white placeholder:text-white/35 backdrop-blur-[1px] focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-white/45">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-medium text-white/70 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white">
          Sign up
        </Link>
      </p>
    </SignUpAuthShell>
  );
}
