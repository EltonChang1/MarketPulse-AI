import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { SignUpAuthShell } from "./ui/sign-in-flow-1";

export default function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await signup(email, password, username.trim());

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  const footer = (
    <p className="text-xs text-white/40">
      By creating an account you agree to use MarketPulse responsibly. This is not financial advice.
    </p>
  );

  return (
    <SignUpAuthShell title="Create account" subtitle="Join MarketPulse AI" footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label htmlFor="su-username" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
            Username <span className="text-red-400/90">*</span>
          </label>
          <input
            id="su-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="trader_jane"
            required
            minLength={2}
            maxLength={24}
            pattern="[a-zA-Z0-9_]{2,24}"
            title="2–24 characters: letters, numbers, underscore"
            className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm text-white placeholder:text-white/35 backdrop-blur-[1px] focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          />
          <p className="mt-1.5 text-center text-[11px] text-white/35">Shown in the top bar when you&apos;re signed in</p>
        </div>

        <div>
          <label htmlFor="su-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
            Email <span className="text-red-400/90">*</span>
          </label>
          <input
            id="su-email"
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
          <label htmlFor="su-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
            Password <span className="text-red-400/90">*</span>
          </label>
          <input
            id="su-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm text-white placeholder:text-white/35 backdrop-blur-[1px] focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          />
        </div>

        <div>
          <label htmlFor="su-confirm" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-white/50">
            Confirm password <span className="text-red-400/90">*</span>
          </label>
          <input
            id="su-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
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
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="text-center text-sm text-white/45">
        Already have an account?{" "}
        <Link to="/signin" className="font-medium text-white/70 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white">
          Sign in
        </Link>
      </p>
    </SignUpAuthShell>
  );
}
