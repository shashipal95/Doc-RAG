"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/auth";
import DocumentViewer from "./DocumentViewer";

export default function DocumentsModal({ onClose, darkMode = false }) {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await authFetch("/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("embedding_provider", "gemini");

      const res = await authFetch("/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("Document uploaded successfully!");
        await loadDocuments();
      } else {
        const error = await res.json();
        alert(`Upload failed: ${error.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm("Delete this document?")) return;

    try {
      const res = await authFetch(`/documents/${docId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        alert("Document deleted");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed");
    }
  };

  const handleView = (doc) => {
    setSelectedDoc(doc);
    setShowViewer(true);
  };

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const bgColor = darkMode ? "#0a0a0f" : "#ffffff";
  const textColor = darkMode ? "#fff" : "#1a1a1a";
  const mutedColor = darkMode ? "#888" : "#666";
  const borderColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  if (showViewer && selectedDoc) {
    return (
      <DocumentViewer
        document={selectedDoc}
        onClose={() => {
          setShowViewer(false);
          setSelectedDoc(null);
        }}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div 
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 32 }}
      onClick={onClose}
    >
      <div 
        style={{ width: "100%", maxWidth: 1000, maxHeight: "90vh", background: bgColor, borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "24px 32px", borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: textColor, margin: "0 0 4px" }}>📁 Your Documents</h2>
            <p style={{ fontSize: 13, color: mutedColor, margin: 0 }}>{documents.length} document{documents.length !== 1 ? "s" : ""}</p>
          </div>
          
          <button 
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", color: textColor, fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* Search and Upload */}
        <div style={{ padding: "16px 32px", display: "flex", gap: 12, borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search documents..."
              style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${borderColor}`, color: textColor, fontSize: 14, outline: "none" }}
            />
          </div>

          <label style={{ display: "inline-block", padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: isUploading ? "not-allowed" : "pointer", border: "none" }}>
            {isUploading ? "⏳ Uploading..." : "⬆️ Upload"}
            <input 
              type="file" 
              onChange={handleUpload}
              disabled={isUploading}
              accept=".pdf,.txt,.docx,.doc"
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Documents List */}
        <div style={{ maxHeight: "calc(90vh - 200px)", overflowY: "auto", padding: "24px 32px" }}>
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
              <p style={{ fontSize: 16, color: mutedColor, margin: 0 }}>
                {searchQuery ? "No documents found" : "No documents uploaded yet"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  style={{ padding: "16px 20px", borderRadius: 12, background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${borderColor}`, display: "flex", alignItems: "center", gap: 16 }}
                >
                  {/* File Icon */}
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: darkMode ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                    {doc.mime_type?.includes("pdf") ? "📕" : 
                     doc.mime_type?.includes("image") ? "🖼️" : 
                     doc.mime_type?.includes("word") ? "📘" : "📄"}
                  </div>

                  {/* File Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: textColor, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.filename}
                    </p>
                    <p style={{ fontSize: 12, color: mutedColor, margin: 0 }}>
                      {formatSize(doc.file_size)} · {formatDate(doc.created_at)} · {doc.chunks} chunks
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => handleView(doc)}
                      style={{ padding: "8px 16px", borderRadius: 8, background: darkMode ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.4)", color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      👁️ View
                    </button>
                    
                    <button
                      onClick={() => handleDelete(doc.id)}
                      style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
