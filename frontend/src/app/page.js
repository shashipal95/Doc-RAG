import Navbar from "@/components/Navbar";
import Link from "next/link";

const FEATURES = [
  { icon: "📄", label: "PDF Support" },
  { icon: "📝", label: "DOCX & TXT" },
  { icon: "🔍", label: "Semantic Search" },
  { icon: "⚡", label: "Real-time Streaming" },
  { icon: "🧠", label: "Multi-Model AI" },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)", overflow: "hidden" }}>
      <Navbar />

      {/* ── Ambient background ── */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div className="orb" style={{
          width: 700, height: 700,
          background: "radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 65%)",
          top: "-10%", left: "15%",
        }} />
        <div className="orb" style={{
          width: 550, height: 550,
          background: "radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 65%)",
          top: "35%", right: "5%",
          animationDelay: "5s", animationDuration: "17s",
        }} />
        <div className="orb" style={{
          width: 450, height: 450,
          background: "radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 65%)",
          bottom: "0%", left: "5%",
          animationDelay: "9s", animationDuration: "20s",
        }} />
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
        {/* Vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, var(--c-bg) 100%)",
        }} />
      </div>

      {/* ── Hero ── */}
      <main style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: "100px 24px 60px",
      }}>

        {/* Headline */}
        <h2
          className="fade-up font-extrabold tracking-tight"
          style={{
            /* Added 2.5rem as the minimum bound */
            fontSize: "clamp(2.5rem, 5.5vw, 5.8rem)",
            /* Increased maxWidth to allow the headline to breathe */
            maxWidth: "900px",
            marginBottom: "24px",
            /* Updated to match your globals.css variable */
            color: "var(--foreground)",
            lineHeight: "1.1"
          }}
        >
          Chat with your{" "}
          <span className="bg-gradient-to-r from-purple-400 to-blue-500 text-transparent bg-clip-text">
            Docs & PDFs
          </span>
          <br />
          like never before
        </h2>

        {/* Sub */}
        <p className="fade-up fade-up-3" style={{
          color: "var(--c-text-muted)",
          fontSize: "clamp(1rem, 2.2vw, 1.15rem)",
          maxWidth: 520,
          lineHeight: 1.75,
          marginBottom: 40,
        }}>
          AI-powered retrieval assistant built for speed and accuracy.
          Upload once, ask anything — get instant, grounded answers.
        </p>

        {/* CTAs */}
        <div className="fade-up fade-up-4" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 64 }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: 15, padding: "14px 32px" }}>
            Get Started Free →
          </Link>
          <Link href="/login" className="btn btn-ghost" style={{ fontSize: 15, padding: "14px 32px" }}>
            Sign In
          </Link>
        </div>

        {/* Feature pills */}
        <div className="fade-up fade-up-5" style={{
          display: "flex", flexWrap: "wrap", gap: 10,
          justifyContent: "center", marginBottom: 80,
        }}>
          {FEATURES.map((f) => (
            <span key={f.label} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: "var(--radius-full)",
              background: "rgba(139,92,246,0.06)",
              border: "1px solid rgba(139,92,246,0.12)",
              color: "var(--c-text-muted)",
              fontSize: 13,
            }}>
              <span>{f.icon}</span> {f.label}
            </span>
          ))}
        </div>

        {/* ── Chat Preview Card ── */}
        <div className="fade-up fade-up-6" style={{ width: "100%", maxWidth: 680, position: "relative" }}>
          {/* Glow behind card */}
          <div style={{
            position: "absolute", inset: -2,
            background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.18), transparent 60%)",
            borderRadius: "calc(var(--radius-xl) + 2px)",
            filter: "blur(2px)",
          }} />

          {/* Card */}
          <div className="glass" style={{ borderRadius: "var(--radius-xl)", padding: "24px", position: "relative" }}>
            {/* Card header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              paddingBottom: 16, marginBottom: 16,
              borderBottom: "1px solid var(--c-border-soft)",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: "var(--g-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#fff",
              }}>✦</div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>DocChat AI</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map(c => (
                  <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
                ))}
              </span>
            </div>

            {/* Messages */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* User */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  background: "var(--g-accent)",
                  borderRadius: "14px 14px 4px 14px",
                  padding: "10px 16px", fontSize: 13, color: "#fff",
                  maxWidth: "72%", lineHeight: 1.5,
                  boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
                }}>
                  Summarise the key findings from the Q3 report
                </div>
              </div>

              {/* Assistant */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: "var(--g-accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#fff",
                }}>G</div>
                <div style={{
                  background: "var(--c-surface-2)",
                  border: "1px solid var(--c-border-soft)",
                  borderRadius: "4px 14px 14px 14px",
                  padding: "10px 16px", fontSize: 13,
                  color: "var(--c-text-muted)",
                  lineHeight: 1.65, maxWidth: "80%",
                }}>
                  Based on the Q3 report, revenue grew <span style={{ color: "#a78bfa", fontWeight: 600 }}>34% YoY</span> driven by enterprise expansion. Key highlights include improved margins and three new regional partnerships…
                  <span style={{
                    display: "inline-block", width: 2, height: 13,
                    background: "#a78bfa", marginLeft: 3,
                    verticalAlign: "middle",
                    animation: "blink 1s step-end infinite",
                  }} />
                </div>
              </div>

              {/* Another user msg (faded) */}
              <div style={{ display: "flex", justifyContent: "flex-end", opacity: 0.4 }}>
                <div style={{
                  background: "var(--g-accent)",
                  borderRadius: "14px 14px 4px 14px",
                  padding: "10px 16px", fontSize: 13, color: "#fff",
                  maxWidth: "60%",
                }}>
                  What were the top risks mentioned?
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}