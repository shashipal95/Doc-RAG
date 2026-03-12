"use client";

import { useState, useEffect } from "react";

export default function DocumentViewer({ document, onClose, darkMode = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if document can be viewed
    const viewableTypes = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!viewableTypes.includes(document.mime_type)) {
      setError("This file type cannot be previewed. Please download it.");
      setLoading(false);
    }
  }, [document]);

  const handleDownload = () => {
    window.open(document.storage_url, "_blank");
  };

  const bgColor = darkMode ? "#0a0a0f" : "#ffffff";
  const textColor = darkMode ? "#fff" : "#1a1a1a";
  const mutedColor = darkMode ? "#888" : "#666";
  const borderColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <div 
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", zIndex: 2000 }}
      onClick={onClose}
    >
      {/* Header */}
      <div 
        style={{ padding: "16px 32px", background: bgColor, borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: textColor, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {document.filename}
          </h3>
          <p style={{ fontSize: 12, color: mutedColor, margin: 0 }}>
            {document.mime_type}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexShrink: 0, marginLeft: 24 }}>
          <button
            onClick={handleDownload}
            style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            ⬇️ Download
          </button>
          
          <button 
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", color: textColor, fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div 
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !error && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, border: "4px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: mutedColor, fontSize: 14 }}>Loading document...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: 16, color: mutedColor, margin: "0 0 16px" }}>{error}</p>
            <button
              onClick={handleDownload}
              style={{ padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              ⬇️ Download File
            </button>
          </div>
        )}

        {!error && document.mime_type === "application/pdf" && (
          <iframe
            src={document.storage_url}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError("Failed to load PDF");
              setLoading(false);
            }}
            style={{ width: "100%", height: "100%", border: "none", borderRadius: 12, background: "#fff" }}
            title={document.filename}
          />
        )}

        {!error && document.mime_type?.startsWith("image/") && (
          <img
            src={document.storage_url}
            alt={document.filename}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError("Failed to load image");
              setLoading(false);
            }}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
