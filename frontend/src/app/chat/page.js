"use client";

import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getCurrentUser, getValidToken, authFetch,
  signOut, initializeSupabaseSession,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { VoiceInput } from "@/components/VoiceInput";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function extractToken(line) {
  if (!line || line === "[DONE]") return "";
  return line.replace(/\\n/g, "\n");
}

/* ─────────────────────────────────────────────────────────
   HEADER DROPDOWN  (model / embed)
───────────────────────────────────────────────────────── */
function Dropdown({ label, value, onChange, options, isDark }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const cur = options.find(o => o.value === value);

  const surf = isDark ? "#1B1910" : "#F0EDE6";
  const bdr = isDark ? "rgba(255,218,100,.13)" : "#CEC9BC";
  const txtClr = isDark ? "#F0EDE6" : "#27251D";
  const muted = isDark ? "rgba(240,237,230,.48)" : "#6A6458";
  const menuBg = isDark ? "#1B1910" : "#FFFFFF";
  const menuBd = isDark ? "rgba(255,218,100,.13)" : "#CEC9BC";
  const actBg = isDark ? "rgba(232,168,48,.13)" : "rgba(232,168,48,.10)";

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>

      {/* INLINE LABEL */}
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        fontFamily: "var(--font-mono)",
        color: isDark ? "rgba(240,237,230,.35)" : "#9A9080"
      }}>
        {label}
      </span>

      {/* BUTTON */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 10,
          border: `1px solid ${bdr}`,
          background: surf,
          color: txtClr,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          minWidth: 90,
        }}
      >
        <span style={{ flex: 1 }}>{cur?.label ?? value}</span>
        <svg
          style={{
            width: 12,
            height: 12,
            opacity: .6,
            transition: "transform .15s",
            transform: open ? "rotate(180deg)" : "none",
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* MENU */}
      {open && (
        <div style={{
          position: "absolute",
          zIndex: 400,
          top: "calc(100% + 6px)",
          left: 0,
          background: menuBg,
          border: `1px solid ${menuBd}`,
          borderRadius: 10,
          overflow: "hidden",
          minWidth: 140,
          boxShadow: "0 14px 40px rgba(0,0,0,.35)"
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 13,
                cursor: "pointer",
                border: "none",
                background: value === opt.value ? actBg : "transparent",
                color: value === opt.value ? "#E8A830" : muted,
                fontWeight: value === opt.value ? 600 : 400
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   IMAGE GRID
───────────────────────────────────────────────────────── */
function ImageGrid({ images, isDark }) {
  const [lb, setLb] = useState(null);
  if (!images?.length) return null;
  return (
    <>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
        {images.map((img, i) => (
          <div key={i} onClick={() => setLb(img)} style={{ position: "relative", borderRadius: 8, overflow: "hidden", cursor: "zoom-in", aspectRatio: "16/9", background: isDark ? "rgba(255,255,255,.06)" : "#F0EDE6" }}>
            <img src={img.thumb || img.url} alt={img.title || `Result ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform .2s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              onError={e => e.currentTarget.parentElement.style.display = "none"}
            />
            {img.title && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,.65))", padding: "14px 8px 5px", fontSize: 9.5, color: "#fff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{img.title}</div>}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, marginTop: 5, color: isDark ? "rgba(255,255,255,.28)" : "#A09888" }}>Images via web search · Click to enlarge</p>
      {lb && (
        <div onClick={() => setLb(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: 900, width: "100%", borderRadius: 14, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.6)" }}>
            <img src={lb.url} alt={lb.title} style={{ width: "100%", display: "block", maxHeight: "80vh", objectFit: "contain", background: "#111" }} />
            <div style={{ background: "#111", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#aaa" }}>{lb.title || "Image"}</span>
              {lb.source && <a href={lb.source} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#E8A830", textDecoration: "none", fontWeight: 600 }}>View source ↗</a>}
            </div>
            <button onClick={() => setLb(null)} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,.6)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   IMAGE PREVIEW CHIP
───────────────────────────────────────────────────────── */
function ImgChip({ image, onClear, isDark }) {
  if (!image) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(232,168,48,.09)", border: "1px solid rgba(232,168,48,.20)", alignSelf: "flex-start", maxWidth: 260 }}>
      <img src={image.previewUrl} alt="preview" style={{ width: 38, height: 38, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#E8A830", marginBottom: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{image.file.name}</p>
        <p style={{ fontSize: 10, color: isDark ? "rgba(240,237,230,.35)" : "#9A9080" }}>{(image.file.size / 1024).toFixed(0)} KB · Image attached</p>
      </div>
      <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14, padding: 2, opacity: .7 }}>✕</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────
   THEME TOKENS
───────────────────────────────────────────────────────── */
const TH = {
  dark: {
    app: "#0C0B09",
    sb: "#0F0E0B",
    sbBdr: "rgba(255,218,100,.07)",
    hdr: "#0C0B09",
    hdrBdr: "rgba(255,218,100,.07)",
    msg: "#0C0B09",
    inp: "#0C0B09",
    inpBdr: "rgba(255,218,100,.07)",
    surface: "#1B1910",
    bdr: "rgba(255,218,100,.07)",
    bdr2: "rgba(255,218,100,.13)",
    text: "#F0EDE6",
    muted: "rgba(240,237,230,.48)",
    faint: "rgba(240,237,230,.22)",
    ghost: "rgba(255,255,255,.05)",
    msgUser: { background: "linear-gradient(135deg,#E8A830,#C07C10)", color: "#0C0B09", boxShadow: "0 3px 16px rgba(232,168,48,.20)" },
    msgAI: { background: "#1B1910", border: "1px solid rgba(255,218,100,.08)", color: "#F0EDE6" },
    sessOn: { background: "rgba(232,168,48,.11)", border: "1px solid rgba(232,168,48,.20)", color: "#F0EDE6" },
    sessOff: "rgba(240,237,230,.38)",
    toggleBtn: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,218,100,.13)", color: "rgba(240,237,230,.48)" },
    sendBtn: { background: "linear-gradient(135deg,#E8A830,#C07C10)", boxShadow: "0 3px 14px rgba(232,168,48,.28)" },
    attBtn: { background: "rgba(232,168,48,.10)", color: "#E8A830", border: "none" },
    textarea: { background: "#1B1910", border: "1px solid rgba(255,218,100,.10)", color: "#F0EDE6" },
    dot: "rgba(232,168,48,.45)",
    cursor: "#E8A830",
    hint: "rgba(240,237,230,.26)",
    hintEm: "rgba(232,168,48,.58)",
    divider: "rgba(255,218,100,.07)",
    isDark: true,
  },
  light: {
    app: "#F4F1EB",
    sb: "#FAFAF8",
    sbBdr: "#E2DDD2",
    hdr: "#FFFFFF",
    hdrBdr: "#E8E4DA",
    msg: "#EEEAE0",
    inp: "#FFFFFF",
    inpBdr: "#E8E4DA",
    surface: "#F0EDE6",
    bdr: "#E2DDD2",
    bdr2: "#CEC9BC",
    text: "#27251D",
    muted: "#6A6458",
    faint: "#9A9080",
    ghost: "rgba(40,38,30,.055)",
    msgUser: { background: "linear-gradient(135deg,#E8A830,#C07C10)", color: "#0C0B09", boxShadow: "0 3px 14px rgba(232,168,48,.20)" },
    msgAI: { background: "#FFFFFF", border: "1px solid #DDD8CC", color: "#27251D" },
    sessOn: { background: "rgba(232,168,48,.09)", border: "1px solid rgba(232,168,48,.24)", color: "#7A5A0E" },
    sessOff: "#7A7568",
    toggleBtn: { background: "#F0EDE6", border: "1px solid #E2DDD2", color: "#6A6458" },
    sendBtn: { background: "linear-gradient(135deg,#E8A830,#C07C10)", boxShadow: "0 3px 14px rgba(232,168,48,.28)" },
    attBtn: { background: "rgba(232,168,48,.08)", color: "#9A6C10", border: "1px solid rgba(232,168,48,.20)" },
    textarea: { background: "#F4F1EB", border: "1px solid #D5D0C5", color: "#27251D" },
    dot: "#C4AE80",
    cursor: "#C07C10",
    hint: "#A09880",
    hintEm: "#B08030",
    divider: "#E2DDD2",
    isDark: false,
  },
};

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
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
  const [docStatus, setDocStatus] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [provider, setProvider] = useState("groq");
  const [embeddingProvider, setEmbP] = useState("gemini");
  const [deletingDocs, setDeletingDocs] = useState(false);
  const [clearMsg, setClearMsg] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [histSearch, setHistSearch] = useState("");
  const [showAttach, setShowAttach] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const hasGreetedRef = useRef(false);
  const latestInputRef = useRef(input);
  const latestImgRef = useRef(selectedImage);

  useEffect(() => { latestInputRef.current = input; }, [input]);
  useEffect(() => { latestImgRef.current = selectedImage; }, [selectedImage]);

  const startNewChat = () => {
    setCurrentSession(null);
    setInput("");
    setSelectedImage(null);
    hasGreetedRef.current = true;
    setMessages([{ role: "assistant", content: "Hello 👋 How can I help you today?" }]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    audioRef.current?.play().catch(() => { });
  };

  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase.from("chat_sessions").select("*").order("created_at", { ascending: false });
    if (!error) setSessions(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      await initializeSupabaseSession();
      const token = await getValidToken();
      if (!token) { router.push("/login"); return; }
      const stored = getCurrentUser();
      if (stored) {
        setUser({ id: stored.id, name: stored.name || stored.email?.split("@")[0], email: stored.email });
      } else {
        try {
          const res = await authFetch("/auth/me");
          const data = await res.json();
          setUser({ id: data.id, name: data.name || data.email?.split("@")[0], email: data.email });
        } catch { router.push("/login"); return; }
      }
      await loadSessions();
      startNewChat();
    };
    init();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const deleteSession = async (id) => {
    await supabase.from("chat_sessions").delete().eq("id", id);
    if (currentSession === id) { setCurrentSession(null); setMessages([]); }
    loadSessions();
  };

  const loadMessages = async (sessionId) => {
    setCurrentSession(sessionId);
    hasGreetedRef.current = true;
    const { data, error } = await supabase.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });
    if (!error) setMessages(data.map(m => {
      const meta = m.metadata || {};
      return {
        role: m.role,
        content: m.content,
        imagePreview: meta.type === "image" ? meta.url : null,
        images: Array.isArray(meta.images) ? meta.images : [],
        streaming: false,
      };
    }));
  };

  const logout = async () => { await signOut(); router.push("/"); };

  const resizeTA = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const DOC_EXTS = [".pdf", ".docx", ".txt"];

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const isImage = IMAGE_TYPES.includes(file.type);
    const isDoc = DOC_EXTS.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isImage) { setSelectedImage({ file, previewUrl: URL.createObjectURL(file) }); return; }

    if (isDoc) {
      setUploading(true);
      setUploadMsg("Indexing…");
      setDocStatus(null);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("embedding_provider", embeddingProvider);
        const res = await authFetch("/upload", { method: "POST", body: form });
        if (!res.ok) { const err = await res.json().catch(() => ({ detail: "Upload failed" })); throw new Error(err.detail); }
        const result = await res.json();
        setUploadMsg(`✓ ${result.chunks_added} chunks indexed`);
        setDocStatus("indexed");
        audioRef.current?.play().catch(() => { });
      } catch (err) {
        setUploadMsg(`✗ ${err.message}`);
        setDocStatus("error");
      } finally {
        setUploading(false);
        setTimeout(() => setUploadMsg(""), 5000);
      }
      return;
    }
    setUploadMsg("✗ Unsupported file type");
    setTimeout(() => setUploadMsg(""), 3500);
  };

  const clearImage = () => {
    if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl);
    setSelectedImage(null);
  };

  const clearDatabase = async () => {
    if (!confirm("Delete ALL your indexed documents?")) return;
    setDeletingDocs(true);
    try {
      const res = await authFetch("/clear", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDocStatus("none");
      setClearMsg("✓ Database cleared");
      setTimeout(() => setClearMsg(""), 3500);
    } catch {
      setClearMsg("✗ Failed");
      setTimeout(() => setClearMsg(""), 3000);
    }
    setDeletingDocs(false);
  };

  const sendMessage = async (e, textOverride = null) => {
    e?.preventDefault();
    const txt = textOverride !== null ? textOverride : latestInputRef.current;
    const img = latestImgRef.current;
    if ((!txt.trim() && !img) || loading) return;
    const question = txt.trim();
    setInput(""); setSelectedImage(null);
    setTimeout(resizeTA, 0);
    setMessages(prev => [...prev, { role: "user", content: question, imagePreview: img?.previewUrl ?? null }]);
    setLoading(true);
    let activeSess = currentSession;

    if (!activeSess) {
      try {
        const res = await authFetch("/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: question.slice(0, 40) || "Image Query" }) });
        if (!res.ok) { setLoading(false); return; }
        const s = await res.json();
        activeSess = s.id;
        setCurrentSession(activeSess);
        await loadSessions();
      } catch { setLoading(false); return; }
    }

    let uploadedUrl = null;
    if (img) {
      try {
        const ext = img.file.name.split(".").pop();
        const path = `${user?.id || "anon"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("chat-media").upload(path, img.file);
        if (!error) {
          const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
          uploadedUrl = data.publicUrl;
        }
      } catch { }
    }

    const { error: userMsgErr } = await supabase.from("chat_messages").insert([{ session_id: activeSess, role: "user", content: question, metadata: uploadedUrl ? { type: "image", url: uploadedUrl } : {} }]);
    if (userMsgErr) console.error("❌ Save user message failed:", userMsgErr.message);
    setMessages(prev => [...prev, { role: "assistant", content: "", images: [], streaming: true }]);

    let full = "", imgs = [];
    try {
      const token = await getValidToken();
      let res;
      if (img) {
        const form = new FormData();
        form.append("question", question); form.append("provider", provider);
        form.append("embedding_provider", embeddingProvider);
        if (activeSess) form.append("session_id", activeSess);
        form.append("image", img.file);
        res = await fetch(`${BASE_URL}/query-image`, { method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: form });
      } else {
        res = await fetch(`${BASE_URL}/query`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ question, top_k: 3, provider, embedding_provider: embeddingProvider, session_id: activeSess }) });
      }
      if (!res.ok) { let d = `HTTP ${res.status}`; try { const j = await res.json(); d = j.detail || d; } catch { } throw new Error(d); }

      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = "", done = false;
      while (!done) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n"); let ev = "message", dl = "";
          for (const ln of lines) {
            if (ln.startsWith("event: ")) ev = ln.slice(7).trim();
            else if (ln.startsWith("data: ")) dl = ln.slice(6);
          }
          if (ev === "done" || dl === "[DONE]") { done = true; break; }
          if (ev === "images") { try { imgs = JSON.parse(dl); setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], images: imgs }; return u; }); } catch { } continue; }
          if (ev === "error") { try { full = `Error: ${JSON.parse(dl).error}`; } catch { full = "An error occurred."; } done = true; break; }
          try { const tok = extractToken(dl); if (tok) { full = full ? full + tok : tok.replace(/^\n+/, ""); setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: full, streaming: true }; return u; }); } } catch { }
        }
      }
      audioRef.current?.play().catch(() => { });
    } catch (err) { full = full || `Error: ${err.message}`; }

    const final = (full || "No response.").replace(/^\n+/, "");
    setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: final, images: imgs, streaming: false }; return u; });
    const { error: aiMsgErr } = await supabase.from("chat_messages").insert([{ session_id: activeSess, role: "assistant", content: final, metadata: { images: imgs } }]);
    if (aiMsgErr) console.error("❌ Save assistant message failed:", aiMsgErr.message);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  };

  const filteredSessions = sessions.filter(s => s.title?.toLowerCase().includes(histSearch.toLowerCase()));
  const SB_W = 252;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: th.app, fontFamily: "var(--font-body)" }}>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.docx,.txt" style={{ display: "none" }} onChange={handleFile} />
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" />

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes msgIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
        @keyframes pop{from{opacity:0;transform:scale(.95) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .msg-in{animation:msgIn .24s ease both}
        .sb-del{opacity:0!important;transition:opacity .14s}
        .sb-row:hover .sb-del{opacity:.65!important}
        textarea:focus{outline:none}
        textarea::placeholder{color:${th.faint}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${th.isDark ? "rgba(232,168,48,.18)" : "rgba(180,140,40,.22)"};border-radius:99px}
      `}</style>

      {/* ══════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════ */}
      <aside style={{ width: sidebarOpen ? SB_W : 0, flexShrink: 0, overflow: "hidden", transition: "width .24s cubic-bezier(.4,0,.2,1)", background: th.sb, borderRight: `1px solid ${th.sbBdr}`, display: "flex", flexDirection: "column" }}>
        <div style={{ width: SB_W, height: "100%", display: "flex", flexDirection: "column" }}>

          {/* ① DocsChat LOGO ─────────────────── */}
          <div style={{ padding: "17px 17px 15px", borderBottom: `1px solid ${th.divider}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#E8A830,#C07C10)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#0C0B09", boxShadow: "0 0 18px rgba(232,168,48,.26)", flexShrink: 0 }}>D</div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "-.022em", color: th.text }}>DocsChat</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".07em", textTransform: "uppercase", color: "#E8A830", background: "rgba(232,168,48,.09)", border: "1px solid rgba(232,168,48,.18)", padding: "3px 7px", borderRadius: 99 }}>AI</span>
            </div>
            <button onClick={startNewChat} style={{ marginTop: 11, width: "100%", padding: "9px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "var(--font-body)", transition: "all .18s", background: "linear-gradient(135deg,#E8A830,#C07C10)", color: "#0C0B09", boxShadow: "0 3px 14px rgba(232,168,48,.22)" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Chat
            </button>
          </div>

          {/* ② SEARCH + HISTORY ─────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "13px 16px 0" }}>
            <p style={{ fontSize: 9.5, color: th.faint, textTransform: "uppercase", letterSpacing: ".10em", fontWeight: 600, fontFamily: "var(--font-mono)", marginBottom: 9 }}>Chat History</p>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 9 }}>
              <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={th.faint} strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input value={histSearch} onChange={e => setHistSearch(e.target.value)} placeholder="Search conversations…"
                style={{ width: "100%", padding: "7px 10px 7px 28px", borderRadius: 8, fontSize: 12, background: th.ghost, border: `1px solid ${th.bdr}`, color: th.text, fontFamily: "var(--font-body)", outline: "none" }}
                onFocus={e => { e.target.style.borderColor = "rgba(232,168,48,.36)"; e.target.style.boxShadow = "0 0 0 3px rgba(232,168,48,.07)"; }}
                onBlur={e => { e.target.style.borderColor = th.bdr; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Session list */}
            <div style={{ flex: 1, overflowY: "auto", margin: "0 -4px", padding: "0 4px 10px" }}>
              {filteredSessions.length === 0 && (
                <p style={{ fontSize: 12, color: th.faint, textAlign: "center", marginTop: 12 }}>
                  {histSearch ? "No matches" : "No conversations yet"}
                </p>
              )}
              {filteredSessions.map(s => (
                <div key={s.id} className="sb-row" style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 8px", borderRadius: 8, marginBottom: 2, cursor: "pointer", border: `1px solid ${currentSession === s.id ? th.sessOn["border-color"] || "transparent" : "transparent"}`, transition: "background .13s", ...(currentSession === s.id ? th.sessOn : {}) }}
                  onMouseEnter={e => { if (currentSession !== s.id) e.currentTarget.style.background = th.ghost; }}
                  onMouseLeave={e => { if (currentSession !== s.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 12, opacity: .45 }}>💬</span>
                  <span onClick={() => loadMessages(s.id)} style={{ flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: currentSession === s.id ? th.sessOn.color : th.sessOff }}>{s.title}</span>
                  <button className="sb-del" onClick={() => deleteSession(s.id)} style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11, padding: "2px 3px", lineHeight: 1, flexShrink: 0, borderRadius: 4, transition: "opacity .14s" }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* ③ CLEAR DATABASE ─────────────────── */}
          <div style={{ padding: "10px 16px 11px", borderTop: `1px solid ${th.divider}`, flexShrink: 0 }}>
            <button onClick={clearDatabase} disabled={deletingDocs} style={{ width: "100%", padding: "8px 12px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: deletingDocs ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "var(--font-body)", transition: "all .15s", background: "transparent", border: `1px solid ${th.isDark ? "rgba(239,68,68,.17)" : "rgba(220,38,38,.22)"}`, color: th.isDark ? "rgba(248,113,113,.82)" : "#B91C1C", opacity: deletingDocs ? .5 : 1 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {deletingDocs ? (
                <><span style={{ width: 12, height: 12, border: "2px solid rgba(239,68,68,.28)", borderTopColor: "#F87171", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />Clearing…</>
              ) : (
                <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>Clear Database</>
              )}
            </button>
            {clearMsg && <p style={{ marginTop: 6, textAlign: "center", fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: ".04em", color: clearMsg.startsWith("✓") ? "#5EC995" : "#F87171" }}>{clearMsg}</p>}
          </div>

          {/* ④ USER + SIGN OUT ─────────────────── */}
          <div style={{ padding: "11px 16px 14px", borderTop: `1px solid ${th.divider}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#E8A830,#C07C10)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#0C0B09", boxShadow: "0 2px 8px rgba(232,168,48,.24)", flexShrink: 0 }}>
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: th.text, letterSpacing: "-.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "User"}</p>
                <p style={{ fontSize: 10, color: th.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{user?.email || ""}</p>
              </div>
              <button onClick={logout} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 7, fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all .14s", background: th.isDark ? "rgba(239,68,68,.07)" : "rgba(220,38,38,.05)", border: `1px solid ${th.isDark ? "rgba(239,68,68,.14)" : "rgba(220,38,38,.18)"}`, color: th.isDark ? "#F87171" : "#DC2626" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.14)"}
                onMouseLeave={e => e.currentTarget.style.background = th.isDark ? "rgba(239,68,68,.07)" : "rgba(220,38,38,.05)"}
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                Sign out
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* ══════════════════════════════════════
          MAIN
      ══════════════════════════════════════ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* HEADER */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", height: 56, flexShrink: 0, background: th.hdr, borderBottom: `1px solid ${th.hdrBdr}`, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {/* Hamburger */}
            <button onClick={() => setSidebarOpen(v => !v)} style={{ background: "transparent", border: "none", padding: 7, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", color: th.muted, transition: "background .13s", flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = th.ghost}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Logo — only when sidebar is closed */}
            {!sidebarOpen && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg,#E8A830,#C07C10)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, color: "#0C0B09", boxShadow: "0 0 10px rgba(232,168,48,.22)", flexShrink: 0 }}>D</div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, color: th.text, letterSpacing: "-.02em" }}>DocsChat</span>
              </div>
            )}

            <div style={{ width: 1, height: 18, background: th.divider, flexShrink: 0 }} />

            {/* Model + Embed dropdowns */}
            <Dropdown label="Model" value={provider} onChange={v => { setProvider(v); if (textareaRef.current) textareaRef.current.placeholder = `Ask ${MODEL_OPTS.find(o => o.value === v)?.label}…`; }} options={MODEL_OPTS} isDark={th.isDark} />
            <Dropdown label="Embed" value={embeddingProvider} onChange={setEmbP} options={EMBED_OPTS} isDark={th.isDark} />

            {/* Doc status */}
            {docStatus === "indexed" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 99, background: "rgba(94,201,149,.09)", border: "1px solid rgba(94,201,149,.22)", fontSize: 10.5, fontFamily: "var(--font-mono)", color: "#5EC995", letterSpacing: ".04em" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#5EC995", display: "inline-block" }} />Docs indexed
              </div>
            )}
          </div>

          {/* RIGHT: Theme toggle */}
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{ ...th.toggleBtn, display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)", transition: "opacity .15s", flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>{th.isDark ? "☀️" : "🌙"}</span>
            {th.isDark ? "Light" : "Dark"}
          </button>
        </header>

        {/* MESSAGES */}
        <div style={{ flex: 1, overflowY: "auto", background: th.msg }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 14px", display: "flex", flexDirection: "column", gap: 18 }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-in" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 10 }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#E8A830,#C07C10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0C0B09", fontFamily: "var(--font-display)", boxShadow: "0 2px 10px rgba(232,168,48,.26)", marginTop: 2 }}>D</div>
                )}
                <div style={{ maxWidth: "78%", padding: "12px 16px", fontSize: 14, lineHeight: 1.72, borderRadius: msg.role === "user" ? "16px 16px 3px 16px" : "3px 16px 16px 16px", ...(msg.role === "user" ? th.msgUser : th.msgAI) }}>
                  {msg.imagePreview && (
                    <div style={{ marginBottom: 8 }}>
                      <img src={msg.imagePreview} alt="attached" style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, display: "block", objectFit: "cover" }} />
                      <p style={{ fontSize: 10, marginTop: 4, opacity: .65 }}>🖼 Image attached</p>
                    </div>
                  )}
                  {msg.streaming && !msg.content ? (
                    <span style={{ display: "flex", gap: 4, alignItems: "center", height: 18 }}>
                      {[0, 1, 2].map(j => <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: th.dot, animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${j * .18}s`, display: "inline-block" }} />)}
                    </span>
                  ) : (
                    <>
                      <ReactMarkdown components={{
                        p: ({ node, ...p }) => <p style={{ margin: "3px 0" }} {...p} />,
                        ul: ({ node, ...p }) => <ul style={{ paddingLeft: 18, margin: "4px 0" }} {...p} />,
                        ol: ({ node, ...p }) => <ol style={{ paddingLeft: 18, margin: "4px 0" }} {...p} />,
                        li: ({ node, ...p }) => <li style={{ marginBottom: 2 }} {...p} />,
                        strong: ({ node, ...p }) => <strong style={{ fontWeight: 700 }} {...p} />,
                        code: ({ node, inline, ...p }) => inline
                          ? <code style={{ background: th.isDark ? "rgba(232,168,48,.12)" : "rgba(232,168,48,.10)", color: th.isDark ? "#E8C870" : "#9A6C10", padding: "1px 5px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 12 }} {...p} />
                          : <code style={{ display: "block", background: th.isDark ? "#111009" : "#EAE7DE", padding: "10px 14px", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, overflowX: "auto", margin: "6px 0", color: th.isDark ? "#E8C870" : "#5A4A20" }} {...p} />,
                      }}>
                        {msg.content?.replace(/\n{3,}/g, "\n\n")}
                      </ReactMarkdown>
                      {msg.streaming && <span style={{ display: "inline-block", width: 2, height: 14, background: th.cursor, marginLeft: 3, verticalAlign: "middle", animation: "blink 1s step-end infinite", borderRadius: 2 }} />}
                    </>
                  )}
                  {msg.role === "assistant" && msg.images?.length > 0 && <ImageGrid images={msg.images} isDark={th.isDark} />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT */}
        <div style={{ flexShrink: 0, padding: "12px 20px 16px", background: th.inp, borderTop: `1px solid ${th.inpBdr}` }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>

            {/* Upload status pill */}
            {uploadMsg && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", marginBottom: 8, borderRadius: 99, fontSize: 11, fontFamily: "var(--font-mono)", background: uploadMsg.startsWith("✓") ? "rgba(94,201,149,.09)" : "rgba(239,68,68,.08)", border: `1px solid ${uploadMsg.startsWith("✓") ? "rgba(94,201,149,.22)" : "rgba(239,68,68,.18)"}`, color: uploadMsg.startsWith("✓") ? "#5EC995" : "#F87171" }}>{uploadMsg}</div>
            )}

            {selectedImage && <ImgChip image={selectedImage} onClear={clearImage} isDark={th.isDark} />}

            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              {/* Attach button + popup */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button onClick={() => setShowAttach(v => !v)} disabled={uploading} style={{ ...th.attBtn, width: 44, height: 44, borderRadius: 11, cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .16s", opacity: uploading ? .4 : 1, position: "relative" }}>
                  {uploading
                    ? <span style={{ width: 14, height: 14, border: "2px solid rgba(232,168,48,.3)", borderTopColor: "#E8A830", borderRadius: "50%", animation: "spin .7s linear infinite", display: "block" }} />
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                  }
                  {(selectedImage || docStatus === "indexed") && !uploading && (
                    <span style={{ position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: "50%", background: "#E8A830", border: `2px solid ${th.inp}` }} />
                  )}
                </button>
                {showAttach && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, background: th.isDark ? "#1B1910" : "#FFFFFF", border: `1px solid ${th.bdr2}`, borderRadius: 12, overflow: "hidden", minWidth: 212, boxShadow: "0 14px 40px rgba(0,0,0,.35)", zIndex: 200 }}>
                    <div style={{ padding: "9px 13px 4px", fontSize: 9.5, color: th.faint, fontFamily: "var(--font-mono)", letterSpacing: ".09em", textTransform: "uppercase" }}>Attach file</div>
                    {[
                      { icon: "📄", title: "PDF / DOCX / TXT", accept: ".pdf,.docx,.txt" },
                      { icon: "🖼️", title: "Image", sub: "Vision Q&A", accept: "image/*" },
                    ].map(opt => (
                      <button key={opt.title} onClick={() => { setShowAttach(false); if (fileInputRef.current) { fileInputRef.current.accept = opt.accept; fileInputRef.current.click(); } }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", borderTop: `1px solid ${th.bdr}`, cursor: "pointer", textAlign: "left", transition: "background .12s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(232,168,48,.06)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontSize: 19 }}>{opt.icon}</span>
                        <div>
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: th.text, marginBottom: 1 }}>{opt.title}</p>
                          <p style={{ fontSize: 10.5, color: th.muted }}>{opt.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Textarea */}
              <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); resizeTA(); }} onKeyDown={handleKeyDown} placeholder={`Ask ${MODEL_OPTS.find(o => o.value === provider)?.label ?? provider}…`} disabled={loading} rows={1} style={{ flex: 1, resize: "none", borderRadius: 11, padding: "12px 16px", fontSize: 14, lineHeight: 1.55, overflow: "hidden", maxHeight: 160, fontFamily: "var(--font-body)", transition: "border-color .2s,box-shadow .2s", opacity: loading ? .55 : 1, ...th.textarea }}
                onFocus={e => { e.target.style.borderColor = "rgba(232,168,48,.40)"; e.target.style.boxShadow = "0 0 0 3px rgba(232,168,48,.08)"; }}
                onBlur={e => { e.target.style.borderColor = ""; e.target.style.boxShadow = "none"; }}
              />

              {/* Voice */}
              <VoiceInput
                onTranscript={(text) => { setInput(prev => (prev + " " + text).trim()); resizeTA(); }}
                onSpeechEnd={() => { if (latestInputRef.current.trim() || latestImgRef.current) sendMessage(null, latestInputRef.current); }}
                onError={err => console.error("Voice:", err)}
              />

              {/* Send */}
              <button onClick={sendMessage} disabled={loading || (!input.trim() && !selectedImage)} style={{ ...th.sendBtn, border: "none", borderRadius: 11, width: 44, height: 44, cursor: loading || (!input.trim() && !selectedImage) ? "not-allowed" : "pointer", opacity: loading || (!input.trim() && !selectedImage) ? .28 : 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .17s", flexShrink: 0 }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "scale(1.05)"; }}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {loading
                  ? <span style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,.25)", borderTopColor: "#0C0B09", borderRadius: "50%", animation: "spin .7s linear infinite", display: "block" }} />
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0C0B09" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                }
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: th.hint, marginTop: 7 }}>
              Enter to send · Shift+Enter for new line ·{" "}
              <span style={{ color: th.hintEm }}>📎 attach PDF / DOCX / TXT or image</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}