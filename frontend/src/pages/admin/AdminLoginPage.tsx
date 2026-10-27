import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function AdminLoginPage() {
  const { token, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/admin";
  if (token) return <Navigate to="/admin" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand"><span className="admin-brand-mark">M</span><span>menu<span className="brand-light">studio</span><small>PLATFORM ADMIN</small></span></div>
        <div className="login-heading"><span className="login-kicker">WELCOME BACK</span><h1>Sign in to your workspace</h1><p>Manage cafes, menus, and QR experiences from one place.</p></div>
        {error && <div className="login-error" role="alert">{error}</div>}
        <form onSubmit={submit} className="login-form">
          <label className="form-field"><span className="field-label">Admin email</span><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label>
          <label className="form-field"><span className="field-label">Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
          <button className="admin-button primary login-submit" disabled={busy}>{busy ? <><span className="button-spinner" /> Signing in…</> : <>Sign in <span>→</span></>}</button>
        </form>
        <div className="login-foot"><span className="lock-icon">⌑</span> Protected platform access</div>
      </section>
      <aside className="login-aside"><div className="aside-rule" /><p>ONE PLACE FOR<br />EVERY GOOD MENU.</p><span>Simple tools for a considered guest experience.</span><small>IMMERSIVE MENU&nbsp;&nbsp;·&nbsp;&nbsp;ADMIN</small></aside>
    </main>
  );
}
