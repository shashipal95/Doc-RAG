"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Signup() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      const { message } = await signUp({ email, password, fullName: name });
      setSuccess(message || "Account created! Check your email to verify.");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: "Full Name",  type: "text",     placeholder: "Ada Lovelace",     val: name,     set: setName },
    { label: "Email",      type: "email",    placeholder: "you@company.com",  val: email,    set: setEmail },
    { label: "Password",   type: "password", placeholder: "Min. 8 characters",val: password, set: setPassword },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--c-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      <Navbar />

      {/* Ambient */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <div className="orb" style={{
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(180,100,10,0.10) 0%, transparent 70%)",
          top: "-10%", left: "2%",
          animationDuration: "19s",
        }} />
        <div className="orb" style={{
          width: 440, height: 440,
          background: "radial-gradient(circle, rgba(232,168,48,0.07) 0%, transparent 70%)",
          bottom: "-12%", right: "8%",
          animationDelay: "9s", animationDuration: "23s",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,210,80,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,210,80,0.022) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }} />
      </div>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div className="fade-up fade-up-1" style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 30 }}>
            <div></div>

          </Link>
          <h1 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontWeight: 700,
            fontSize: 30,
            color: "var(--c-text)",
            letterSpacing: "-0.025em",
            marginBottom: 8,
            lineHeight: 1.15,
          }}>
            Create your account
          </h1>
          <p style={{ color: "var(--c-text-muted)", fontSize: 14, fontWeight: 400 }}>
            Start chatting with your documents today
          </p>
        </div>

        {/* Card */}
        <div className="fade-up fade-up-2" style={{
          background: "var(--c-surface)",
          border: "1px solid rgba(255,220,120,0.09)",
          borderRadius: "var(--radius-xl)",
          padding: "32px 28px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 1px 0 rgba(255,210,80,0.05) inset",
        }}>

          {error && (
            <div style={{
              background: "var(--c-error-bg)",
              border: "1px solid var(--c-error-border)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--c-error)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {success && (
            <div style={{
              background: "var(--c-success-bg)",
              border: "1px solid rgba(94,201,149,0.2)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--c-success)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {fields.map(({ label, type, placeholder, val, set }, i) => (
              <div
                key={label}
                className={`fade-up fade-up-${i + 3}`}
                style={{ display: "flex", flexDirection: "column", gap: 7 }}
              >
                <label style={{
                  fontSize: 11,
                  color: "var(--c-text-faint)",
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                }}>{label}</label>
                <input
                  className="input"
                  type={type}
                  placeholder={placeholder}
                  required
                  value={val}
                  onChange={e => set(e.target.value)}
                />
              </div>
            ))}

            {/* Password strength hint */}
            {password.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginTop: -8 }}>
                {[1, 2, 3, 4].map(n => (
                  <div key={n} style={{
                    flex: 1, height: 2, borderRadius: 99,
                    background: password.length >= n * 2
                      ? password.length >= 8 ? "#5EC995" : "#E8A830"
                      : "var(--c-border-soft)",
                    transition: "background 0.25s",
                  }} />
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary fade-up fade-up-6"
              style={{
                width: "100%",
                marginTop: 4,
                padding: "14px",
                opacity: loading ? 0.65 : 1,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15,
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{
                    width: 15, height: 15,
                    border: "2px solid rgba(12,11,9,0.3)",
                    borderTopColor: "#0C0B09",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    display: "inline-block",
                  }} />
                  Creating account…
                </span>
              ) : "Create account →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: "var(--c-text-faint)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--c-accent)", textDecoration: "none", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Trust */}
        <div className="fade-up fade-up-6" style={{
          display: "flex", justifyContent: "center", gap: 28, marginTop: 24,
        }}>
          {["🔒 Secure", "⚡ Fast", "🆓 Free tier"].map(b => (
            <span key={b} style={{ fontSize: 12, color: "var(--c-text-faint)" }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
