"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const path = usePathname();

    return (
        <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            background: "rgba(8,8,16,0.80)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(139,92,246,0.10)",
        }}>
            <div style={{
                maxWidth: 1100, margin: "0 auto",
                padding: "0 24px",
                height: 50,
                display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>

                {/* Logo */}
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: "#fff",
                        boxShadow: "0 0 20px rgba(124,58,237,0.4)",
                        flexShrink: 0,
                    }}>✦</div>
                    <span style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700, fontSize: 18,
                        letterSpacing: "-0.02em", color: "#e8e8f0",
                    }}>DocChat</span>
                </Link>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Link href="/login"
                        className="btn btn-ghost btn-sm"
                        style={{
                            color: path === "/login" ? "#e8e8f0" : "rgba(232,232,240,0.5)",
                            background: path === "/login" ? "rgba(255,255,255,0.08)" : "transparent",
                            border: "none",
                        }}>
                        Login
                    </Link>
                    <Link href="/signup" className="btn btn-primary btn-sm">
                        Get Started
                    </Link>
                </div>
            </div>
        </nav>
    );
}