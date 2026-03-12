import Navbar from "@/components/Navbar";
import Link from "next/link";

const FEATURES = [
  { icon: "PDF", label: "PDF Support" },
  { icon: "DOC", label: "DOCX & TXT" },
  { icon: "SEM", label: "Semantic Search" },
  { icon: "STR", label: "Streaming" },
  { icon: "AI",  label: "Multi-Model" },
];

// A small sample doc icon SVG inline
function DocIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 0h7l5 5v11H2V0z" fill="rgba(232,168,48,0.12)" stroke="rgba(232,168,48,0.4)" strokeWidth="0.8"/>
      <path d="M9 0v5h5" fill="none" stroke="rgba(232,168,48,0.4)" strokeWidth="0.8"/>
      <path d="M4 8h6M4 10.5h6M4 13h4" stroke="rgba(232,168,48,0.45)" strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  );
}

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)", overflow: "hidden", position: "relative" }}>
      <Navbar />

      {/* ── Ambient background ── */}
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {/* Warm amber core glow — left */}
        <div className="orb" style={{
          width: 640, height: 640,
          background: "radial-gradient(circle, rgba(200,130,20,0.11) 0%, transparent 65%)",
          top: "5%", left: "-5%",
        }} />
        {/* Subtle warm right glow */}
        <div className="orb" style={{
          width: 500, height: 500,
          background: "radial-gradient(circle, rgba(232,168,48,0.07) 0%, transparent 65%)",
          top: "30%", right: "0%",
          animationDelay: "7s", animationDuration: "20s",
        }} />
        {/* Bottom earth tone */}
        <div className="orb" style={{
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(180,100,10,0.08) 0%, transparent 65%)",
          bottom: "0%", left: "30%",
          animationDelay: "12s", animationDuration: "24s",
        }} />
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,210,80,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,210,80,0.025) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }} />
        {/* Edge vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, var(--c-bg) 100%)",
        }} />
      </div>

      {/* ── Main Content ── */}
      <main style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: "100px 24px 80px",
      }}>

        {/* Eyebrow badge */}
        <div className="fade-up" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          marginBottom: 28,
          padding: "6px 14px",
          borderRadius: 999,
          background: "rgba(232,168,48,0.07)",
          border: "1px solid rgba(232,168,48,0.16)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#E8A830",
            boxShadow: "0 0 8px #E8A830",
            display: "inline-block",
          }} />
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.09em",
            color: "#E8A830",
            textTransform: "uppercase",
          }}>Now with multi-model AI</span>
        </div>

        {/* Headline — editorial serif */}
        <h1
          className="fade-up fade-up-1 text-display"
          style={{
            fontSize: "clamp(2.8rem, 6vw, 6.2rem)",
            maxWidth: 860,
            marginBottom: 28,
            color: "var(--c-text)",
            lineHeight: "1.06",
          }}
        >
          Your documents,{" "}
          <span style={{
            fontStyle: "italic",
            background: "linear-gradient(90deg, #E8A830 0%, #F5D080 50%, #C47D10 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>finally</span>
          {" "}speak
        </h1>

        {/* Subtext */}
        <p className="fade-up fade-up-2" style={{
          color: "var(--c-text-muted)",
          fontSize: "clamp(1rem, 2vw, 1.1rem)",
          maxWidth: 480,
          lineHeight: 1.8,
          marginBottom: 44,
          fontWeight: 400,
        }}>
          Upload any document and start a conversation. Get precise, sourced answers in seconds — no hallucinations, no fluff.
        </p>

        {/* CTAs */}
        <div className="fade-up fade-up-3" style={{
          display: "flex", gap: 10, flexWrap: "wrap",
          justifyContent: "center", marginBottom: 56,
        }}>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: 15, padding: "14px 30px" }}>
            Start for free
            <span style={{ marginLeft: 2, opacity: 0.8 }}>→</span>
          </Link>
          <Link href="/login" className="btn btn-ghost" style={{ fontSize: 15, padding: "14px 30px" }}>
            Sign in
          </Link>
        </div>

        {/* Feature pills — monospaced, minimal */}
        <div className="fade-up fade-up-4" style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          justifyContent: "center", marginBottom: 72,
        }}>
          {FEATURES.map((f) => (
            <span key={f.label} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "6px 14px", borderRadius: 999,
              background: "var(--c-surface-2)",
              border: "1px solid var(--c-border-soft)",
              color: "var(--c-text-muted)",
              fontSize: 12.5,
            }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--c-accent)",
                letterSpacing: "0.05em",
                background: "var(--c-accent-soft)",
                padding: "2px 5px",
                borderRadius: 4,
              }}>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>

        {/* ── Chat Preview ── */}
        <div className="fade-up fade-up-5" style={{ width: "100%", maxWidth: 660, position: "relative" }}>

          {/* Glow halo */}
          <div style={{
            position: "absolute", inset: -1,
            background: "linear-gradient(135deg, rgba(232,168,48,0.18), rgba(196,125,16,0.10), transparent 55%)",
            borderRadius: "calc(var(--radius-xl) + 2px)",
            filter: "blur(1px)",
          }} />

          {/* Card */}
          <div style={{
            borderRadius: "var(--radius-xl)",
            background: "var(--c-surface)",
            border: "1px solid rgba(255,220,120,0.09)",
            padding: "0",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 2px 0 rgba(255,210,80,0.06) inset",
          }}>

            {/* Window chrome */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: "1px solid rgba(255,220,120,0.07)",
              background: "rgba(255,255,255,0.02)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {["#FF5F57", "#FEBC2E", "#28C840"].map(c => (
                  <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.85 }} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DocIcon />
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--c-text-faint)",
                  letterSpacing: "0.04em",
                }}>Q3_Report_2024.pdf</span>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(94,201,149,0.08)",
                border: "1px solid rgba(94,201,149,0.18)",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#5EC995", boxShadow: "0 0 6px #5EC995" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#5EC995", letterSpacing: "0.06em" }}>LIVE</span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* User message */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  background: "linear-gradient(135deg, #E8A830 0%, #C47D10 100%)",
                  borderRadius: "16px 16px 3px 16px",
                  padding: "11px 18px", fontSize: 13.5, color: "#0C0B09",
                  maxWidth: "72%", lineHeight: 1.6,
                  fontWeight: 500,
                  boxShadow: "0 4px 18px rgba(232,168,48,0.25)",
                }}>
                  Summarise the key findings from Q3
                </div>
              </div>

              {/* AI message */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #E8A830 0%, #C47D10 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#0C0B09",
                  fontFamily: "var(--font-display)",
                  boxShadow: "0 2px 10px rgba(232,168,48,0.3)",
                }}>D</div>
                <div style={{
                  background: "var(--c-surface-2)",
                  border: "1px solid var(--c-border-soft)",
                  borderRadius: "3px 16px 16px 16px",
                  padding: "12px 18px", fontSize: 13.5,
                  color: "var(--c-text-muted)",
                  lineHeight: 1.75, maxWidth: "80%",
                }}>
                  Revenue grew{" "}
                  <span style={{
                    color: "#E8A830", fontWeight: 600,
                    background: "rgba(232,168,48,0.1)",
                    padding: "1px 6px", borderRadius: 4,
                    fontFamily: "var(--font-mono)", fontSize: 12.5,
                  }}>+34% YoY</span>
                  {" "}driven by enterprise expansion. Margins improved 4.2 pts, with three new regional partnerships added in APAC…
                  <span style={{
                    display: "inline-block", width: 2, height: 13,
                    background: "#E8A830", marginLeft: 4,
                    verticalAlign: "middle",
                    animation: "blink 1s step-end infinite",
                    borderRadius: 2,
                  }} />
                </div>
              </div>

              {/* Second user (faded) */}
              <div style={{ display: "flex", justifyContent: "flex-end", opacity: 0.3 }}>
                <div style={{
                  background: "linear-gradient(135deg, #E8A830 0%, #C47D10 100%)",
                  borderRadius: "16px 16px 3px 16px",
                  padding: "11px 18px", fontSize: 13.5, color: "#0C0B09",
                  fontWeight: 500, maxWidth: "60%",
                }}>
                  What risks were flagged?
                </div>
              </div>
            </div>

            {/* Input bar mock */}
            <div style={{
              padding: "14px 18px",
              borderTop: "1px solid rgba(255,220,120,0.07)",
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(0,0,0,0.15)",
            }}>
              <div style={{
                flex: 1, height: 38,
                background: "var(--c-surface-3)",
                border: "1px solid var(--c-border-soft)",
                borderRadius: 10,
                display: "flex", alignItems: "center",
                padding: "0 14px",
              }}>
                <span style={{ fontSize: 12.5, color: "var(--c-text-faint)", fontFamily: "var(--font-body)" }}>
                  Ask anything about your document…
                </span>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: "linear-gradient(135deg, #E8A830, #C47D10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(232,168,48,0.3)",
              }}>→</div>
            </div>
          </div>

          {/* Trust line below card */}
          <p style={{
            marginTop: 22,
            fontSize: 12,
            color: "var(--c-text-faint)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}>
            No credit card · Free forever · Answers grounded in your docs
          </p>
        </div>
      </main>
    </div>
  );
}
