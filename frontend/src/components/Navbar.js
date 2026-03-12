"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const path = usePathname();

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(12, 11, 9, 0.82)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255, 220, 120, 0.07)",
    }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto",
        padding: "0 28px",
        height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>

        {/* Logo */}
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: 11,
          textDecoration: "none", color: "#F0EDE6",
          outline: "none",
        }}>
          {/* Mark — a simple serif-inspired icon */}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #E8A830 0%, #C47D10 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: "#0C0B09",
            boxShadow: "0 0 24px rgba(232,168,48,0.3)",
            flexShrink: 0,
            fontFamily: "'Lora', Georgia, serif",
            letterSpacing: "-0.02em",
          }}>D</div>
          <span style={{
            fontFamily: "'Lora', Georgia, serif",
            fontWeight: 600,
            fontSize: 17.5,
            letterSpacing: "-0.025em",
            color: "#F0EDE6",
          }}>DocsChat</span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link
            href="/login"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13.5,
              fontWeight: 500,
              color: path === "/login" ? "#F0EDE6" : "rgba(240,237,230,0.5)",
              background: path === "/login" ? "rgba(255,255,255,0.06)" : "transparent",
              padding: "7px 15px",
              borderRadius: 8,
              textDecoration: "none",
              transition: "all 0.15s",
              border: "1px solid transparent",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="btn btn-primary btn-sm"
            style={{ fontSize: 13.5, letterSpacing: "-0.01em" }}
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
