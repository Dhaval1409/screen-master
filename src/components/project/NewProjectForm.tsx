// src/components/project/NewProjectForm.tsx
"use client";

import { useState } from "react";

interface Props {
  onCreated: (project: any) => void;
  onCancel: () => void;
}

const GENRES = ["Thriller", "Drama", "Comedy", "Romance", "Horror", "Action", "Sci-Fi", "Mystery", "Fantasy", "Crime", "Historical", "Biographical"];
const STORY_TYPES = ["Feature Film", "Short Film", "Web Series Episode", "Pilot"];
const PAGE_OPTIONS = [10, 20, 30, 60, 90, 120];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0e0e10",
  border: "1px solid #2a2a2c",
  borderRadius: "8px",
  color: "#f0f0ea",
  fontSize: "13px",
  fontFamily: "'Courier Prime', 'Courier New', monospace",
  padding: "11px 14px",
  outline: "none",
  boxSizing: "border-box",
};

export function NewProjectForm({ onCreated, onCancel }: Props) {
  const [form, setForm] = useState({
    title: "",
    genre: "Thriller",
    storyType: "Feature Film",
    targetPages: 90,
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create project."); return; }
      onCreated(data.project);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "#161618",
      border: "1px solid #2a2a2c",
      borderRadius: "12px",
      padding: "24px",
      maxWidth: "560px",
      margin: "0 auto",
      fontFamily: "'Courier Prime', 'Courier New', monospace",
    }}>
      <div style={{ color: "#e8c84a", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "20px" }}>
        🎬 New Screenplay Project
      </div>

      {/* Title */}
      <div style={{ marginBottom: "14px" }}>
        <label style={{ display: "block", color: "#555", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "6px" }}>Project Title</label>
        <input
          value={form.title}
          onChange={e => set("title", e.target.value)}
          placeholder="e.g. Dark Shadows of Delhi"
          style={inputStyle}
        />
      </div>

      {/* Genre + Story Type */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", color: "#555", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "6px" }}>Genre</label>
          <select
            value={form.genre}
            onChange={e => set("genre", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", color: "#555", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "6px" }}>Type</label>
          <select
            value={form.storyType}
            onChange={e => set("storyType", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {STORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Target pages */}
      <div style={{ marginBottom: "14px" }}>
        <label style={{ display: "block", color: "#555", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "8px" }}>
          Target Length — {form.targetPages} pages (~{Math.round(form.targetPages / 2)} chunks · ~{form.targetPages} min)
        </label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {PAGE_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => set("targetPages", p)}
              style={{
                background: form.targetPages === p ? "#e8c84a" : "#0e0e10",
                color: form.targetPages === p ? "#111" : "#555",
                border: `1px solid ${form.targetPages === p ? "#e8c84a" : "#2a2a2c"}`,
                borderRadius: "6px",
                padding: "6px 14px",
                fontFamily: "'Courier Prime', monospace",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >{p}p</button>
          ))}
        </div>
      </div>

      {/* Description / Premise */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", color: "#555", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "6px" }}>Story Premise</label>
        <textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe your story — characters, setting, central conflict, tone. The more detail, the better the AI generates..."
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {error && (
        <div style={{ background: "#2a1212", border: "1px solid #4a2222", borderRadius: "6px", color: "#ff8080", padding: "10px 14px", fontSize: "12px", marginBottom: "14px" }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            flex: 1,
            background: loading ? "#333" : "#e8c84a",
            color: loading ? "#666" : "#111",
            border: "none",
            borderRadius: "8px",
            padding: "13px",
            fontFamily: "'Courier Prime', monospace",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating & Writing..." : "Create Project"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            background: "transparent",
            border: "1px solid #2a2a2c",
            borderRadius: "8px",
            color: "#555",
            padding: "13px 20px",
            fontFamily: "'Courier Prime', monospace",
            fontSize: "12px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >Cancel</button>
      </div>

      {loading && (
        <div style={{ marginTop: "14px", color: "#555", fontSize: "11px", letterSpacing: "0.1em", textAlign: "center" }}>
          Creating project and generating opening scene...
        </div>
      )}
    </div>
  );
}