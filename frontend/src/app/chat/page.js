"use client";

import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentUser, getValidToken, authFetch, signOut, initializeSupabaseSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { VoiceInput } from "@/components/VoiceInput";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function extractToken(dataLine) {
  if (!dataLine || dataLine === "[DONE]") return "";
  return dataLine.replace(/\\n/g, "\n");
}

function Dropdown({ label, value, onChange, options, theme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = options.find(o => o.value === value);
  const th = theme;

  return (
    <div ref={ref} style={{ flex: 1, position: "relative" }}>
      <p style={{ fontSize: 10, color: th.isDark ? "var(--c-text-faint)" : "#6b6b8a", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>{label}</p>
      <button type="button" onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: th.isDark ? "rgba(255,255,255,0.04)" : "#f5f5fa", border: `1px solid ${th.isDark ? "var(--c-border-soft)" : "#d4d4e0"}`, color: th.isDark ? "var(--c-text)" : "#1a1a2e", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "border-color 0.15s", fontFamily: "var(--font-body)" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = th.isDark ? "var(--c-border-soft)" : "#d4d4e0"}
      >
        <span>{current?.label ?? value}</span>
        <svg style={{ width: 12, height: 12, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 100, top: "calc(100% + 4px)", left: 0, right: 0, background: th.isDark ? "var(--c-surface-2)" : "#ffffff", border: `1px solid ${th.isDark ? "var(--c-border)" : "#e8e8f0"}`, borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: th.isDark ? "0 16px 48px rgba(0,0,0,0.5)" : "0 16px 48px rgba(0,0,0,0.15)" }}>
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)", border: "none", background: value === opt.value ? (th.isDark ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.08)") : "transparent", color: value === opt.value ? (th.isDark ? "#c4b5fd" : "#7c3aed") : (th.isDark ? "var(--c-text-muted)" : "#6b6b8a"), fontWeight: value === opt.value ? 600 : 400 }}
              onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = th.isDark ? "rgba(255,255,255,0.05)" : "rgba(124,58,237,0.03)"; }}
              onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = "transparent"; }}
            >{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageGrid({ images, isDark }) {
  const [lightbox, setLightbox] = useState(null);
  if (!images || images.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {images.map((img, idx) => (
          <div key={idx} onClick={() => setLightbox(img)} style={{ position: "relative", borderRadius: 10, overflow: "hidden", cursor: "zoom-in", aspectRatio: "16/9", background: isDark ? "rgba(255,255,255,0.06)" : "#f0f0f8" }}>
            <img
              src={img.thumb || img.url}
              alt={img.title || `Result ${idx + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.25s ease" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              onError={e => { e.currentTarget.parentElement.style.display = "none"; }}
            />
            {img.title && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", padding: "14px 8px 6px", fontSize: 10, color: "#fff", fontWeight: 500, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                {img.title}
              </div>
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, marginTop: 6, color: isDark ? "rgba(255,255,255,0.3)" : "#aaa" }}>
        Images via web search · Click to enlarge
      </p>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: 900, width: "100%", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
            <img src={lightbox.url} alt={lightbox.title || "Full size"} style={{ width: "100%", display: "block", maxHeight: "80vh", objectFit: "contain", background: "#111" }} />
            <div style={{ background: "#111", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#aaa" }}>{lightbox.title || "Image"}</span>
              {lightbox.source && (
                <a href={lightbox.source} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
                  View source ↗
                </a>
              )}
            </div>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}


function ImagePreviewChip({ image, onClear, isDark }) {
  if (!image) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 10, background: isDark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.07)", border: `1px solid ${isDark ? "rgba(124,58,237,0.25)" : "rgba(124,58,237,0.18)"}`, alignSelf: "flex-start", maxWidth: 260 }}>
      <img src={image.previewUrl} alt="preview" style={{ width: 40, height: 40, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: isDark ? "#c4b5fd" : "#7c3aed", marginBottom: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{image.file.name}</p>
        <p style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.35)" : "#9090ac" }}>{(image.file.size / 1024).toFixed(0)} KB · Image attached</p>
      </div>
      <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: isDark ? "rgba(248,113,113,0.7)" : "#ef4444", fontSize: 15, padding: 2, flexShrink: 0, lineHeight: 1 }} title="Remove image">✕</button>
    </div>
  );
}

const MODEL_OPTS = [{ value: "groq", label: "Groq" }, { value: "gemini", label: "Gemini" }, { value: "openai", label: "OpenAI" }, { value: "ollama", label: "Ollama" }];
const EMBED_OPTS = [{ value: "gemini", label: "Gemini" }, { value: "openai", label: "OpenAI" }];

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
    imageBtn: { background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" },
    dotColor: "rgba(255,255,255,0.25)", cursor: "#a78bfa",
    noHistory: "var(--c-text-faint)", hint: "var(--c-text-faint)", subText: "var(--c-text-faint)", divider: "var(--c-border-soft)", userName: "var(--c-text-muted)", menuIcon: "var(--c-text-faint)", isDark: true,
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
    imageBtn: { background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)", color: "#7c3aed" },
    dotColor: "#9ca3af", cursor: "#7c3aed", noHistory: "#9ca3af", hint: "#b0b0cc", subText: "#9090ac", divider: "#e8e8f0", userName: "#4a4a6a", menuIcon: "#9090ac", isDark: false,
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
  const [selectedImage, setSelectedImage] = useState(null);

  const messagesEndRef = useRef(null);
  const unifiedFileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const hasGreetedRef = useRef(false);

  // 🔥 REFS FOR AUTO-SUBMIT 
  const latestInputRef = useRef(input);
  const latestImageRef = useRef(selectedImage);

  useEffect(() => { latestInputRef.current = input; }, [input]);
  useEffect(() => { latestImageRef.current = selectedImage; }, [selectedImage]);

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
      initializeSupabaseSession();
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
  }, [loadSessions, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const deleteSession = async (id) => {
    await supabase.from("chat_sessions").delete().eq("id", id);
    if (currentSession === id) { setCurrentSession(null); hasGreetedRef.current = false; setMessages([]); }
    loadSessions();
  };

  const loadMessages = async (sessionId) => {
    setCurrentSession(sessionId);
    hasGreetedRef.current = true;
    const { data, error } = await supabase.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: true });

    if (!error) setMessages(
      data.map(m => {
        const metadata = m.metadata || {};

        return {
          role: m.role,
          content: m.content,
          // Read the actual image URL from the database metadata
          imagePreview: metadata.type === "image" ? metadata.url : null,
          images: metadata.images || [],
          streaming: false,
        };
      })
    );
  };

  const logout = async () => {
    await signOut();
    router.push("/");
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const DOC_EXTS = [".pdf", ".docx", ".txt"];

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isImage = IMAGE_TYPES.includes(file.type);
    const isDoc = DOC_EXTS.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isImage) {
      const previewUrl = URL.createObjectURL(file);
      setSelectedImage({ file, previewUrl });
      return;
    }

    if (isDoc) {
      setUploading(true);
      setUploadMsg("Indexing…");
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("embedding_provider", embeddingProvider);
        const res = await authFetch("/upload", { method: "POST", body: form });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(err.detail);
        }
        const result = await res.json();
        setUploadMsg(`✓ ${result.chunks_added} chunks indexed`);
        audioRef.current?.play().catch(() => { });
      } catch (err) {
        setUploadMsg(`✗ ${err.message}`);
      } finally {
        setUploading(false);
        setTimeout(() => setUploadMsg(""), 4000);
      }
      return;
    }

    setUploadMsg("✗ Unsupported file. Use PDF, DOCX, TXT, or an image.");
    setTimeout(() => setUploadMsg(""), 3500);
  };

  const clearImage = () => {
    if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl);
    setSelectedImage(null);
  };

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

  // 🔥 SEND FUNCTION 
  // 🔥 SEND FUNCTION 
  const sendMessage = async (e, textOverride = null) => {
    e?.preventDefault();
    const currentText = textOverride !== null ? textOverride : latestInputRef.current;
    const imageToSend = latestImageRef.current;

    if ((!currentText.trim() && !imageToSend) || loading) return;

    const question = currentText.trim();

    setInput("");
    setSelectedImage(null);
    setTimeout(resizeTextarea, 0);

    setMessages(prev => [
      ...prev,
      { role: "user", content: question, imagePreview: imageToSend?.previewUrl ?? null },
    ]);

    setLoading(true);
    let activeSession = currentSession;

    if (!activeSession) {
      try {
        const res = await authFetch("/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: question.slice(0, 40) || "Image Search" }),
        });
        if (!res.ok) { setLoading(false); return; }
        const s = await res.json();
        activeSession = s.id;
        setCurrentSession(activeSession);
        await loadSessions();
      } catch { setLoading(false); return; }
    }

    // 🔥 NEW: UPLOAD IMAGE TO 'chat-media' BUCKET
    let uploadedImageUrl = null;
    if (imageToSend) {
      try {
        const fileExt = imageToSend.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user?.id || 'anonymous'}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, imageToSend.file);

        if (uploadError) {
          console.error("Storage upload failed:", uploadError);
        } else {
          const { data: publicData } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath);

          uploadedImageUrl = publicData.publicUrl;
        }
      } catch (err) {
        console.error("Image upload process failed:", err);
      }
    }

    // 🔥 FIX: Save User message to Supabase WITH metadata url
    supabase.from("chat_messages")
      .insert([{
        session_id: activeSession,
        role: "user",
        content: question,
        metadata: uploadedImageUrl ? { type: "image", url: uploadedImageUrl } : {}
      }])
      .then(({ error }) => { if (error) console.error("Supabase message insert:", error); });

    setMessages(prev => [...prev, { role: "assistant", content: "", images: [], streaming: true }]);

    let fullResponse = "";
    let collectedImages = [];

    try {
      const token = await getValidToken();

      let res;
      if (imageToSend) {
        const form = new FormData();
        form.append("question", question);
        form.append("provider", provider);
        form.append("embedding_provider", embeddingProvider);
        if (activeSession) form.append("session_id", activeSession);
        form.append("image", imageToSend.file);

        res = await fetch(`${BASE_URL}/query-image`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: form,
        });
      } else {
        res = await fetch(`${BASE_URL}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({
            question,
            top_k: 3,
            provider,
            embedding_provider: embeddingProvider,
            session_id: activeSession,
          }),
        });
      }

      if (!res.ok) {
        let errDetail = `HTTP ${res.status}`;
        try { const j = await res.json(); errDetail = j.detail || JSON.stringify(j); } catch { }
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

          if (eventType === "done" || dataLine === "[DONE]") { done = true; break; }

          if (eventType === "images") {
            try {
              collectedImages = JSON.parse(dataLine);
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { ...u[u.length - 1], images: collectedImages };
                return u;
              });
            } catch { /* ignore */ }
            continue;
          }

          if (eventType === "error") {
            try { fullResponse = `Error: ${JSON.parse(dataLine).error}`; } catch { fullResponse = "An error occurred."; }
            done = true;
            break;
          }

          try {
            const tok = extractToken(dataLine);
            if (tok) {
              fullResponse = fullResponse ? fullResponse + tok : tok.replace(/^\n+/, "");
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { ...u[u.length - 1], content: fullResponse, streaming: true };
                return u;
              });
            }
          } catch (parseErr) { console.error("Token parse:", parseErr); }
        }
      }

      audioRef.current?.play().catch(() => { });

    } catch (err) {
      fullResponse = fullResponse || `Error: ${err.message}`;
    }

    const final = (fullResponse || "No response.").replace(/^\n+/, "");
    setMessages(prev => {
      const u = [...prev];
      u[u.length - 1] = { role: "assistant", content: final, images: collectedImages, streaming: false };
      return u;
    });

    // 🔥 FIX: Save Assistant message to Supabase WITH images array in metadata
    supabase.from("chat_messages")
      .insert([{
        session_id: activeSession,
        role: "assistant",
        content: final,
        metadata: { images: collectedImages }
      }])
      .then(({ error }) => { if (error) console.error("Supabase assistant insert:", error); });

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (textareaRef.current && !loading && (input.trim() || selectedImage)) textareaRef.current.blur();
      sendMessage(e);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: th.msgArea.background, fontFamily: "var(--font-body)" }}>
      <input
        ref={unifiedFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.docx,.txt"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" />

      {/* SIDEBAR */}
      <aside style={{ width: sidebarOpen ? 230 : 0, flexShrink: 0, overflow: "hidden", transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", ...th.sidebar }}>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minWidth: 230 }}>

          <div style={{ textAlign: "center", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${th.divider}` }}>
            <div className="wave-hand" style={{ fontSize: 30, marginBottom: 6, display: "block" }}>😎</div>
            <p style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 20, color: th.isDark ? "var(--c-text)" : "#1a1a2e", marginBottom: 3 }}>Welcome back</p>
            {user && <p style={{ fontSize: 12, color: th.userName, marginBottom: 10, wordBreak: "break-all" }}>{user.name}</p>}
            <button onClick={logout} style={{ padding: "6px 16px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)", border: "none", background: "rgba(239,68,68,0.08)", color: "#f87171", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
            >Sign out</button>
          </div>

          <button onClick={startNewChat} style={{ ...th.newChat, width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", fontFamily: "var(--font-body)", marginBottom: 10, transition: "all 0.15s" }}>
            <span style={{ fontSize: 16 }}>+</span> New Chat
          </button>

          <div style={{ display: "flex", gap: 8, marginBottom: uploadMsg ? 4 : 12 }}>
            <button
              onClick={() => unifiedFileInputRef.current?.click()}
              disabled={uploading}
              title="Upload PDF, DOCX, TXT — or attach an image to chat"
              style={{ ...th.upload, flex: 1, padding: "8px 10px", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 500, cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "var(--font-body)", transition: "all 0.15s", opacity: uploading ? 0.5 : 1 }}>
              <span>{uploading ? "⏳" : "📎"}</span>{uploading ? "Indexing…" : "Attach"}
            </button>
            <button onClick={deleteDocuments} disabled={deletingDocs} style={{ ...th.delete, flex: 1, padding: "8px 10px", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "var(--font-body)", transition: "all 0.15s", opacity: deletingDocs ? 0.5 : 1 }}>
              <span>🗑</span>{deletingDocs ? "…" : "Delete"}
            </button>
          </div>
          {uploadMsg && <p style={{ fontSize: 11, marginBottom: 10, paddingLeft: 2, color: uploadMsg.startsWith("✓") ? "#34d399" : "#f87171" }}>{uploadMsg}</p>}

          <div style={{ display: "flex", gap: 10, marginBottom: 2 }}>
            <Dropdown label="Model" value={provider} onChange={setProvider} options={MODEL_OPTS} theme={th} />
            <Dropdown label="Embed" value={embeddingProvider} onChange={setEmbeddingProvider} options={EMBED_OPTS} theme={th} />
          </div>

          <div style={{ borderTop: `1px solid ${th.divider}`, margin: "12px 0" }} />

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

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", ...th.msgArea }} className="no-scrollbar">
          <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 10 }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "var(--g-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", boxShadow: "0 0 12px rgba(124,58,237,0.3)", marginTop: 2 }}>✦</div>
                )}
                <div style={{ maxWidth: msg.role === "assistant" && msg.images?.length > 0 ? "82%" : "76%", padding: "11px 16px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px", fontSize: 14, lineHeight: 1.65, ...(msg.role === "user" ? th.msgUser : th.msgBot) }}>

                  {msg.imagePreview && (
                    <div style={{ marginBottom: 8 }}>
                      <img src={msg.imagePreview} alt="attached" style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, display: "block", objectFit: "cover" }} />
                      <p style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>🖼 Image attached</p>
                    </div>
                  )}

                  {msg.streaming && !msg.content ? (
                    <span style={{ display: "flex", gap: 4, alignItems: "center", height: 16 }}>
                      {[0, 1, 2].map(j => <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: th.dotColor, animation: "fadeIn 0.8s ease-in-out infinite alternate", animationDelay: `${j * 0.2}s` }} />)}
                    </span>
                  ) : (
                      <>
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => (
                              <p style={{ margin: "4px 0" }} {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul style={{ paddingLeft: "18px", margin: "4px 0" }} {...props} />
                            ),
                            li: ({ node, ...props }) => (
                              <li style={{ marginBottom: "2px" }} {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong style={{ fontWeight: 600 }} {...props} />
                            )
                          }}
                        >
                          {msg.content?.replace(/\n{3,}/g, "\n\n")}
                        </ReactMarkdown>

                        {msg.streaming && (
                          <span
                            style={{
                              display: "inline-block",
                              width: 2,
                              height: 14,
                              background: th.cursor,
                              marginLeft: 3,
                              verticalAlign: "middle",
                              animation: "blink 1s step-end infinite"
                            }}
                          />
                        )}
                      </>
                  )}

                  {msg.role === "assistant" && msg.images?.length > 0 && (
                    <ImageGrid images={msg.images} isDark={th.isDark} />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div style={{ flexShrink: 0, padding: "12px 20px 16px", ...th.inputWrap }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>

            {selectedImage && (
              <ImagePreviewChip image={selectedImage} onClear={clearImage} isDark={th.isDark} />
            )}

            <form onSubmit={sendMessage} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>

              <button
                type="button"
                onClick={() => unifiedFileInputRef.current?.click()}
                disabled={loading || uploading}
                title="Attach image (vision Q&A) or PDF/DOCX/TXT (index for RAG)"
                style={{
                  ...th.imageBtn,
                  padding: "12px 13px",
                  borderRadius: "var(--radius-md)",
                  cursor: (loading || uploading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.18s", opacity: (loading || uploading) ? 0.4 : 1, position: "relative",
                }}
                onMouseEnter={e => { if (!loading && !uploading) e.currentTarget.style.background = th.isDark ? "rgba(124,58,237,0.22)" : "rgba(124,58,237,0.14)"; }}
                onMouseLeave={e => e.currentTarget.style.background = th.imageBtn.background}
              >
                {uploading ? (
                  <span style={{ width: 15, height: 15, border: "2px solid rgba(167,139,250,0.3)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "block" }} />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                )}
                {selectedImage && !uploading && (
                  <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", border: `2px solid ${th.isDark ? "var(--c-bg)" : "#fafafa"}` }} />
                )}
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); resizeTextarea(); }}
                onKeyDown={handleKeyDown}
                placeholder={selectedImage ? "Ask about this image…" : `Ask ${MODEL_OPTS.find(o => o.value === provider)?.label ?? provider}…`}
                disabled={loading}
                rows={1}
                className="no-scrollbar"
                style={{ flex: 1, resize: "none", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14, lineHeight: 1.5, outline: "none", overflow: "hidden", maxHeight: 160, fontFamily: "var(--font-body)", transition: "border-color 0.2s, box-shadow 0.2s", opacity: loading ? 0.5 : 1, ...th.textarea }}
                onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.10)"; }}
                onBlur={e => { e.target.style.borderColor = ""; e.target.style.boxShadow = "none"; }}
              />

              <VoiceInput
                onTranscript={(text) => { setInput(prev => prev + " " + text); resizeTextarea(); }}
                onSpeechEnd={() => {
                  // 🔥 FIX: Now uses the latest input AND image refs
                  if (latestInputRef.current.trim() || latestImageRef.current) {
                    sendMessage(null, latestInputRef.current);
                  }
                }}
                onError={(err) => console.error("Voice error:", err)}
              />

              <button type="submit" disabled={loading || (!input.trim() && !selectedImage)} style={{ ...th.sendBtn, border: "none", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: loading || (!input.trim() && !selectedImage) ? "not-allowed" : "pointer", opacity: loading || (!input.trim() && !selectedImage) ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", flexShrink: 0 }}>
                {loading
                  ? <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "block" }} />
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                }
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 11, color: th.hint, marginTop: 8 }}>
              Enter to send · Shift+Enter for new line ·{" "}
              <span style={{ color: th.isDark ? "#a78bfa" : "#7c3aed" }}>
                📎 attach image for vision · PDF/DOCX/TXT to index
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}