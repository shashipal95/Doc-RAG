"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth";   // ← backend auth, not supabase client
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Signup() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true); setError(""); setSuccess("");
        try {
            const { message } = await signUp({ email, password, fullName: name });  // calls POST /auth/signup
            setSuccess(message || "Account created! Check your email to verify.");
            setTimeout(() => router.push("/login"), 2500);
        } catch (err) {
            setError(err.message || "Signup failed. Try again.");
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
                    width: 550, height: 550,
                    background: "radial-gradient(circle, rgba(79,70,229,0.13) 0%, transparent 70%)",
                    top: "-10%", left: "8%",
                }} />
                <div className="orb" style={{
                    width: 450, height: 450,
                    background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
                    bottom: "-8%", right: "5%", animationDelay: "7s",
                }} />
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)",
                    backgroundSize: "64px 64px",
                }} />
            </div>

            <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

                {/* Logo */}
                <div className="fade-up fade-up-1" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
                    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 28 }}>
                        
                    </Link>
                    <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, color: "var(--c-text)", letterSpacing: "-0.025em", marginBottom: 8 }}>
                        Create your account
                    </h1>
                    <p style={{ color: "var(--c-text-muted)", fontSize: 14 }}>Start chatting with your documents</p>
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

                    {success && (
                        <div style={{
                            background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
                            borderRadius: "var(--radius-md)", padding: "10px 14px",
                            marginBottom: 20, fontSize: 13, color: "#34d399",
                        }}>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {[
                            { label: "Full Name", type: "text", placeholder: "Your name", val: name, set: setName },
                            { label: "Email", type: "email", placeholder: "you@example.com", val: email, set: setEmail },
                            { label: "Password", type: "password", placeholder: "Min. 8 characters", val: password, set: setPassword },
                        ].map(({ label, type, placeholder, val, set }, i) => (
                            <div key={label} className={`fade-up fade-up-${i + 2}`} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                <label style={{ fontSize: 11, color: "var(--c-text-faint)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
                                    {label}
                                </label>
                                <input className="input" type={type} placeholder={placeholder} required value={val} onChange={e => set(e.target.value)} />
                            </div>
                        ))}

                        <button type="submit" disabled={loading} className="btn btn-primary fade-up fade-up-5"
                            style={{ width: "100%", marginTop: 8, padding: "14px", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", fontSize: 15 }}>
                            {loading ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                                    Creating account…
                                </span>
                            ) : "Create Account →"}
                        </button>
                    </form>

                    <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--c-text-faint)" }}>
                        Already have an account?{" "}
                        <Link href="/login" style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
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
