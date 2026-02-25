"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth";   // ← backend auth, not supabase client
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            await signIn({ email, password });   // calls POST /auth/login → saves tokens
            router.push("/chat");
        } catch (err) {
            setError(err.message || "Login failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        
        <div style={{
            minHeight: "100vh", background: "var(--c-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, position: "relative", overflow: "hidden",
        }}>
            <Navbar />


            {/* Ambient orbs */}
            <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
                <div className="orb" style={{
                    width: 500, height: 500,
                    background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
                    top: "-15%", right: "10%",
                }} />
                <div className="orb" style={{
                    width: 400, height: 400,
                    background: "radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%)",
                    bottom: "-5%", left: "5%", animationDelay: "6s",
                }} />
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)",
                    backgroundSize: "64px 64px",
                }} />
            </div>

            <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

                {/* Logo */}
                <div className="fade-up fade-up-1" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 28 }}>
                        
                    </Link>
                    <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, color: "var(--c-text)", letterSpacing: "-0.025em", marginBottom: 8 }}>
                        Welcome back
                    </h1>
                    <p style={{ color: "var(--c-text-muted)", fontSize: 14 }}>Sign in to your account</p>
                </div>

                {/* Card */}
                <div className="glass fade-up fade-up-2" style={{ borderRadius: "var(--radius-xl)", padding: "32px 28px" }}>

                    {error && (
                        <div style={{
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: "var(--radius-md)", padding: "10px 14px",
                            marginBottom: 20, fontSize: 13, color: "#f87171",
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        <div className="fade-up fade-up-3" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                            <label style={{ fontSize: 11, color: "var(--c-text-faint)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Email</label>
                            <input className="input" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                        </div>

                        <div className="fade-up fade-up-4" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                            <label style={{ fontSize: 11, color: "var(--c-text-faint)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Password</label>
                            <input className="input" type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary fade-up fade-up-5"
                            style={{ width: "100%", marginTop: 8, padding: "14px", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", fontSize: 15 }}>
                            {loading ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                                    Signing in…
                                </span>
                            ) : "Sign in →"}
                        </button>
                    </form>

                    <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--c-text-faint)" }}>
                        No account?{" "}
                        <Link href="/signup" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>Create one free</Link>
                    </p>
                </div>

                <div className="fade-up fade-up-6" style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24 }}>
                    {["🔒 Secure", "⚡ Instant", "🆓 Free"].map(b => (
                        <span key={b} style={{ fontSize: 12, color: "var(--c-text-faint)" }}>{b}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
