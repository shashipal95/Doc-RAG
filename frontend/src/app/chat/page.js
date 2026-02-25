"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentUser, getValidToken, authFetch, signOut, initializeSupabaseSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";  // still used for direct DB queries (sessions/messages)
import { VoiceInput } from "@/components/VoiceInput";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function extractToken(dataLine) {
  if (!dataLine || dataLine === "[DONE]") return "";
  return dataLine.replace(/\\n/g, "\n");
}



// ── Dropdown ───────────────────────────────────────────────────────────────
function Dropdown({ label, value, onChange, options, theme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ flex: 1, position: "relative" }}>
      <p style={{
        fontSize: 10,
        color: theme.isDark ? "var(--c-text-faint)" : "#6b6b8a",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 600,
        marginBottom: 6
      }}>{label}</p>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderRadius: "var(--radius-sm)",
        background: theme.isDark ? "rgba(255,255,255,0.04)" : "#f5f5fa",
        border: `1px solid ${theme.isDark ? "var(--c-border-soft)" : "#d4d4e0"}`,
        color: theme.isDark ? "var(--c-text)" : "#1a1a2e",
        fontSize: 13, fontWeight: 500, cursor: "pointer",
        transition: "border-color 0.15s", fontFamily: "var(--font-body)",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = theme.isDark ? "var(--c-border-soft)" : "#d4d4e0"}
      >
        <span>{current?.label ?? value}</span>
        <svg style={{ width: 12, height: 12, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", zIndex: 100, top: "calc(100% + 4px)", left: 0, right: 0,
          background: theme.isDark ? "var(--c-surface-2)" : "#ffffff",
          border: `1px solid ${theme.isDark ? "var(--c-border)" : "#e8e8f0"}`,
          borderRadius: "var(--radius-md)", overflow: "hidden",
          boxShadow: theme.isDark ? "0 16px 48px rgba(0,0,0,0.5)" : "0 16px 48px rgba(0,0,0,0.15)",
        }}>
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }} style={{
              width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13,
              cursor: "pointer", fontFamily: "var(--font-body)", border: "none",
              background: value === opt.value ? (theme.isDark ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.08)") : "transparent",
              color: value === opt.value ? (theme.isDark ? "#c4b5fd" : "#7c3aed") : (theme.isDark ? "var(--c-text-muted)" : "#6b6b8a"),
              fontWeight: value === opt.value ? 600 : 400, transition: "background 0.1s",
            }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(124,58,237,0.03)"; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = "transparent"; }}
            >{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const MODEL_OPTS = [
  { value: "groq", label: "Groq" },
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama" },
];
const EMBED_OPTS = [
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
];

const TH = {
  dark: {
    sidebar: { background: "var(--c-surface)", borderRight: "1px solid var(--c-border-soft)" },
    header: { background: "var(--c-bg)", borderBottom: "1px solid var(--c-border-soft)" },
    inputWrap: { background: "var(--c-bg)", borderTop: "1px solid var(--c-border-soft)" },
    msgArea: { background: "var(--c-bg)" },
    textarea: { background: "rgba(255,255,255,0.04)", border: "1px solid var(--c-border-soft)", color: "var(--c-text)" },
    msgUser: { background: "var(--g-accent)", color: "#fff", boxShadow: "0 4px 20px rgba(124,58,237,0.25)" },
    msgBot: { background: "var(--c-surface-2)", border: "1px solid var(--c-border-soft)", color: "#ffffff" },
    sessionOn: { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--c-text)" },
    sessionOff: { color: "var(--c-text-faint)" },
    newChat: { background: "var(--g-accent)", color: "#fff", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" },
    upload: { background: "rgba(255,255,255,0.04)", border: "1px solid var(--c-border-soft)", color: "var(--c-text-muted)" },
    delete: { background: "transparent", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(248,113,113,0.7)" },
    toggleBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid var(--c-border-soft)", color: "var(--c-text-muted)" },
    sendBtn: { background: "var(--g-accent)", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" },
    dotColor: "rgba(255,255,255,0.25)", cursor: "#a78bfa",
    noHistory: "var(--c-text-faint)", hint: "var(--c-text-faint)",
    subText: "var(--c-text-faint)", divider: "var(--c-border-soft)",
    userName: "var(--c-text-muted)", menuIcon: "var(--c-text-faint)",
    isDark: true,
  },
  light: {
    sidebar: { background: "#ffffff", borderRight: "1px solid #e8e8f0" },
    header: { background: "#fafafa", borderBottom: "1px solid #e8e8f0" },
    inputWrap: { background: "#fafafa", borderTop: "1px solid #e8e8f0" },
    msgArea: { background: "#f5f5fa" },
    textarea: { background: "#fff", border: "1px solid #d4d4e0", color: "#1a1a2e" },
    msgUser: { background: "var(--g-accent)", color: "#fff", boxShadow: "0 4px 20px rgba(124,58,237,0.2)" },
    msgBot: { background: "#ffffff", border: "1px solid #e8e8f0", color: "#3a3a5c" },
    sessionOn: { background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", color: "#4c1d95" },
    sessionOff: { color: "#6b6b8a" },
    newChat: { background: "var(--g-accent)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.25)" },
    upload: { background: "#f5f5fa", border: "1px solid #d4d4e0", color: "#6b6b8a" },
    delete: { background: "transparent", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" },
    toggleBtn: { background: "#f0f0f8", border: "1px solid #d4d4e0", color: "#6b6b8a" },
    sendBtn: { background: "var(--g-accent)", boxShadow: "0 4px 16px rgba(124,58,237,0.2)" },
    dotColor: "#9ca3af", cursor: "#7c3aed",
    noHistory: "#9ca3af", hint: "#b0b0cc",
    subText: "#9090ac", divider: "#e8e8f0",
    userName: "#4a4a6a", menuIcon: "#9090ac",
    isDark: false,
  },
};

export default function ChatPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("dark");
  const th = TH[theme];

  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [provider, setProvider] = useState("groq");
  const [embeddingProvider, setEmbeddingProvider] = useState("gemini");
  const [deletingDocs, setDeletingDocs] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const hasGreetedRef = useRef(false);

  // ── Auth check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // ✅ Initialize Supabase session from stored tokens
      initializeSupabaseSession();

      // getValidToken auto-refreshes if expired
      const token = await getValidToken();
      if (!token) { router.push("/login"); return; }

      // Get user from localStorage (set by signIn)
      const stored = getCurrentUser();
      if (stored) {
        setUser({ id: stored.id, name: stored.name || stored.email?.split("@")[0], email: stored.email });
      } else {
        // Fallback: fetch from backend
        try {
          const res = await authFetch("/auth/me");
          const data = await res.json();
          setUser({ id: data.id, name: data.name || data.email?.split("@")[0], email: data.email });
        } catch { router.push("/login"); return; }
      }

      await loadSessions();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Sessions (still using Supabase client for direct DB access) ───────────
  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase.from("chat_sessions").select("*").order("created_at", { ascending: false });
    if (!error) setSessions(data || []);
  }, []);

  const deleteSession = async (id) => {
    await supabase.from("chat_sessions").delete().eq("id", id);
    if (currentSession === id) { setCurrentSession(null); hasGreetedRef.current = false; setMessages([]); }
    loadSessions();
  };

  const startNewChat = () => {
    setCurrentSession(null);
    setInput("");

    // Reset greeting flag
    hasGreetedRef.current = true;

    // Directly set greeting
    setMessages([
      { role: "assistant", content: "Hello 👋 How can I help you today?" }
    ]);

    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const loadMessages = async (sessionId) => {
    setCurrentSession(sessionId); hasGreetedRef.current = true;
    const { data, error } = await supabase.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
    if (!error) setMessages(data.map(m => ({ role: m.role, content: m.content })));
  };

  // ── Logout — calls backend signOut (revokes Supabase session) ─────────────
  const logout = async () => {
    await signOut();   // calls POST /auth/logout + clears localStorage
    router.push("/");
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg("Uploading…");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("embedding_provider", embeddingProvider);
      const res = await authFetch("/upload", { method: "POST", body: form });
      if (!res.ok) { const err = await res.json().catch(() => ({ detail: "Failed" })); throw new Error(err.detail); }
      const result = await res.json();
      setUploadMsg(`✓ ${result.chunks_added} chunks indexed`);
      audioRef.current?.play().catch(() => { }); // Play sound on successful upload
    } catch (err) { setUploadMsg(`✗ ${err.message}`); }
    finally { setUploading(false); e.target.value = ""; setTimeout(() => setUploadMsg(""), 4000); }
  };

  // ── Delete docs ───────────────────────────────────────────────────────────
  const deleteDocuments = async () => {
    if (!confirm("Delete ALL your indexed documents?")) return;
    setDeletingDocs(true);
    try {
      const res = await authFetch("/clear", { method: "DELETE" });
      if (!res.ok) throw new Error();
      alert("Your documents deleted.");
    } catch { alert("Failed."); }
    setDeletingDocs(false);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();

    // ✅ Immediately clear input and resize for instant feedback
    setInput("");
    setTimeout(resizeTextarea, 0);

    // ✅ Show user message immediately (optimistic UI)
    setMessages(prev => [...prev, { role: "user", content: question }]);

    // Now handle the rest
    setLoading(true);
    let activeSession = currentSession;

    // Create new session if needed using backend API
    if (!activeSession) {
      try {
        const res = await authFetch("/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: question.slice(0, 40) })
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("Session create failed:", err);
          setLoading(false);
          return;
        }

        const s = await res.json();
        activeSession = s.id;
        setCurrentSession(activeSession);
        await loadSessions();
      } catch (err) {
        console.error("Unexpected error creating session:", err);
        setLoading(false);
        return;
      }
    }

    // Save user message to database
    supabase.from("chat_messages")
      .insert([{ session_id: activeSession, role: "user", content: question }])
      .then()
      .catch(err => console.error("Supabase message insert error:", err));

    // Add streaming assistant message placeholder
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    let fullResponse = "";
    try {
      const token = await getValidToken();
      const res = await fetch(`${BASE_URL}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          question,
          top_k: 3,
          provider,
          embedding_provider: embeddingProvider,
          session_id: activeSession
        }),
      });

      if (!res.ok) {
        let errDetail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || JSON.stringify(errJson);
        } catch {
          // ignore JSON parse error
        }
        throw new Error(errDetail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: sd, value } = await reader.read();
        if (sd) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split("\n");
          let eventType = "message", dataLine = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataLine = line.slice(6);
          }

          if (eventType === "done" || dataLine === "[DONE]") {
            done = true;
            break;
          }

          if (eventType === "error") {
            try {
              fullResponse = `Error: ${JSON.parse(dataLine).error}`;
            } catch {
              fullResponse = "An error occurred.";
            }
            done = true;
            break;
          }

          try {
            const tok = extractToken(dataLine);
            if (tok) {
              fullResponse = fullResponse ? fullResponse + tok : tok.replace(/^\n+/, "");
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: "assistant", content: fullResponse, streaming: true };
                return u;
              });
            }
          } catch (parseErr) {
            console.error("Token parse error:", parseErr, dataLine);
          }
        }
      }

      // Play notification sound when response is complete
      audioRef.current?.play().catch(() => { });

    } catch (err) {
      console.error("Caught error in sendMessage:", err);
      if (err instanceof Error) {
        fullResponse = fullResponse || `Error: ${err.message}`;
      } else {
        fullResponse = fullResponse || `Error: ${JSON.stringify(err)}`;
      }
    }

    const final = (fullResponse || "No response.").replace(/^\n+/, "");
    setMessages(prev => {
      const u = [...prev];
      u[u.length - 1] = { role: "assistant", content: final, streaming: false };
      return u;
    });

    supabase.from("chat_messages")
      .insert([{ session_id: activeSession, role: "assistant", content: final }])
      .then()
      .catch(err => console.error("Supabase assistant insert error:", err));

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Add immediate visual feedback by disabling the textarea
      if (textareaRef.current && !loading && input.trim()) {
        textareaRef.current.blur();
      }
      sendMessage(e);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: th.msgArea.background, fontFamily: "var(--font-body)" }}>
      <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" style={{ display: "none" }} onChange={handleFileUpload} />
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" />

      {/* SIDEBAR */}
      <aside style={{ width: sidebarOpen ? 230 : 0, flexShrink: 0, overflow: "hidden", transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", ...th.sidebar }}>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minWidth: 230 }}>

          {/* Welcome */}
          <div style={{ textAlign: "center", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${th.divider}` }}>
            <div className="wave-hand" style={{ fontSize: 30, marginBottom: 6, display: "block" }}>😎</div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: th.isDark ? "var(--c-text)" : "#1a1a2e", marginBottom: 3 }}>Welcome</p>
            {user && <p style={{ fontSize: 12, color: th.userName, marginBottom: 10, wordBreak: "break-all" }}>{user.name}</p>}
            <button onClick={logout} style={{ padding: "6px 16px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)", border: "none", background: "rgba(239,68,68,0.08)", color: "#f87171", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
            >Sign out</button>
          </div>

          {/* New Chat */}
          <button onClick={startNewChat} style={{ ...th.newChat, width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", fontFamily: "var(--font-body)", marginBottom: 10, transition: "all 0.15s" }}>
            <span style={{ fontSize: 16 }}>+</span> New Chat
          </button>

          {/* Upload + Delete */}
          <div style={{ display: "flex", gap: 8, marginBottom: uploadMsg ? 4 : 12 }}>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ ...th.upload, flex: 1, padding: "8px 10px", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "var(--font-body)", transition: "all 0.15s", opacity: uploading ? 0.5 : 1 }}>
              <span>{uploading ? "⏳" : "📄"}</span>{uploading ? "…" : "Upload"}
            </button>
            <button onClick={deleteDocuments} disabled={deletingDocs} style={{ ...th.delete, flex: 1, padding: "8px 10px", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "var(--font-body)", transition: "all 0.15s", opacity: deletingDocs ? 0.5 : 1 }}>
              <span>🗑</span>{deletingDocs ? "…" : "Delete"}
            </button>
          </div>
          {uploadMsg && <p style={{ fontSize: 11, marginBottom: 10, paddingLeft: 2, color: uploadMsg.startsWith("✓") ? "#34d399" : "#f87171" }}>{uploadMsg}</p>}

          {/* Dropdowns - now passing theme prop */}
          <div style={{ display: "flex", gap: 10, marginBottom: 2 }}>
            <Dropdown label="Model" value={provider} onChange={setProvider} options={MODEL_OPTS} theme={th} />
            <Dropdown label="Embed" value={embeddingProvider} onChange={setEmbeddingProvider} options={EMBED_OPTS} theme={th} />
          </div>

          <div style={{ borderTop: `1px solid ${th.divider}`, margin: "12px 0" }} />

          {/* History */}
          <p style={{ fontSize: 10, color: th.subText, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>History</p>
          <div style={{ flex: 1, overflowY: "auto" }} className="no-scrollbar">
            {sessions.length === 0 && <p style={{ fontSize: 12, color: th.noHistory, padding: "4px" }}>No chats yet</p>}
            {sessions.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: "var(--radius-sm)", padding: "7px 8px", marginBottom: 2, cursor: "pointer", transition: "all 0.12s", ...(currentSession === s.id ? th.sessionOn : {}) }}
                onMouseEnter={e => { if (currentSession !== s.id) e.currentTarget.style.background = "rgba(139,92,246,0.06)"; }}
                onMouseLeave={e => { if (currentSession !== s.id) e.currentTarget.style.background = "transparent"; }}
              >
                <span onClick={() => loadMessages(s.id)} style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: currentSession === s.id ? (th.isDark ? "var(--c-text)" : "#4c1d95") : th.sessionOff.color }}>{s.title}</span>
                <button onClick={() => deleteSession(s.id)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, opacity: 0.5, padding: 2, lineHeight: 1, flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, flexShrink: 0, ...th.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{ ...th.toggleBtn, padding: 8, borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", border: "none", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = th.isDark ? "rgba(255,255,255,0.09)" : "#e8e8f0"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={th.menuIcon} strokeWidth={2} strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--g-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700, boxShadow: "0 0 14px rgba(124,58,237,0.3)" }}>✦</div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: th.isDark ? "var(--c-text)" : "#1a1a2e", letterSpacing: "-0.01em" }}>DocChat</span>
            </div>
            <span style={{ fontSize: 12, color: th.subText }}>· {MODEL_OPTS.find(o => o.value === provider)?.label} / {embeddingProvider}</span>
          </div>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ ...th.toggleBtn, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.18s" }}>
            <span style={{ fontSize: 14 }}>{th.isDark ? "☀️" : "🌙"}</span>
            {th.isDark ? "Light" : "Dark"}
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", ...th.msgArea }} className="no-scrollbar">
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 10 }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "var(--g-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", boxShadow: "0 0 12px rgba(124,58,237,0.3)", marginTop: 2 }}>✦</div>
                )}
                <div style={{ maxWidth: "76%", padding: "11px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", ...(msg.role === "user" ? th.msgUser : th.msgBot) }}>
                  {msg.streaming && !msg.content ? (
                    <span style={{ display: "flex", gap: 4, alignItems: "center", height: 16 }}>
                      {[0, 1, 2].map(j => <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: th.dotColor, animation: "fadeIn 0.8s ease-in-out infinite alternate", animationDelay: `${j * 0.2}s` }} />)}
                    </span>
                  ) : (
                    <>
                      {msg.content}
                      {msg.streaming && <span style={{ display: "inline-block", width: 2, height: 14, background: th.cursor, marginLeft: 3, verticalAlign: "middle", animation: "blink 1s step-end infinite" }} />}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: "12px 20px 16px", ...th.inputWrap }}>
          <form onSubmit={sendMessage} style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "flex-end", gap: 10 }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${MODEL_OPTS.find(o => o.value === provider)?.label ?? provider}…`}
              disabled={loading}
              rows={1}
              className="no-scrollbar"
              style={{
                flex: 1,
                resize: "none",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                fontSize: 14,
                lineHeight: 1.5,
                outline: "none",
                overflow: "hidden",
                maxHeight: 160,
                fontFamily: "var(--font-body)",
                transition: "border-color 0.2s, box-shadow 0.2s",
                opacity: loading ? 0.5 : 1,
                ...th.textarea
              }}
              onFocus={e => {
                e.target.style.borderColor = "rgba(124,58,237,0.5)";
                e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.10)";
              }}
              onBlur={e => {
                e.target.style.borderColor = "";
                e.target.style.boxShadow = "none";
              }}
            />

            {/* ✅ ADD THIS BLOCK */}
            <VoiceInput
              onTranscript={(text) => {
                setInput(prev => prev + " " + text);
                resizeTextarea();
              }}
              onError={(err) => {
                console.error("Voice error:", err);
              }}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{ ...th.sendBtn, border: "none", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", opacity: loading || !input.trim() ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", flexShrink: 0 }}>
              {loading
                ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "block" }} />
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              }
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: 11, color: th.hint, marginTop: 8 }}>Enter to send · Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  );
}