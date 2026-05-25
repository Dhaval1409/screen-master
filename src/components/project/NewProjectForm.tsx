// src/components/project/NewProjectForm.tsx
"use client";

import { useState } from "react";

interface Project {
  id: string;
  title: string;
  genre: string;
  storyType: string;
  targetPages: number;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  chunks: {
    id: string;
    chunkNumber: number;
    pageEnd: number;
    summary: string;
  }[];
}

interface Props {
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

const GENRES = ["Thriller", "Drama", "Comedy", "Romance", "Horror", "Action", "Sci-Fi", "Mystery", "Fantasy", "Crime", "Historical", "Biographical"];
const STORY_TYPES = ["Feature Film", "Short Film", "Web Series Episode", "Pilot"];
const PAGE_OPTIONS = [10, 20, 30, 60, 90, 120];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#111",
  border: "1px solid rgba(232,200,74,0.18)",
  borderRadius: "4px",
  color: "#f5f5f0",
  fontSize: "13px",
  fontFamily: "'Courier Prime','Courier New',monospace",
  padding: "13px 14px",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.22)",
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

  const set = (key: keyof typeof form, val: string | number) => setForm(p => ({ ...p, [key]: val }));

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
    <div className="newProjectScene">
      <div className="grain" />

      <div className="formHeader">
        <div>
          <div className="eyebrow">New Screenplay Project</div>
          <h1>Open a new production.</h1>
          <p>Set the genre, target length, and premise before the first scene rolls.</p>
        </div>
        <div className="slate" aria-hidden="true">
          <div className="slateTop">
            <span />
            <span />
            <span />
          </div>
          <div className="slateBody">
            <span>TAKE</span>
            <strong>01</strong>
          </div>
        </div>
      </div>

      <div className="fieldBlock">
        <label className="fieldLabel">Project Title</label>
        <input
          value={form.title}
          onChange={e => set("title", e.target.value)}
          placeholder="e.g. Dark Shadows of Delhi"
          style={inputStyle}
        />
      </div>

      <div className="fieldGrid">
        <div>
          <label className="fieldLabel">Genre</label>
          <select
            value={form.genre}
            onChange={e => set("genre", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="fieldLabel">Type</label>
          <select
            value={form.storyType}
            onChange={e => set("storyType", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {STORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="fieldBlock">
        <label className="fieldLabel">
          Target Length - {form.targetPages} pages (~{Math.round(form.targetPages / 2)} chunks · ~{form.targetPages} min)
        </label>
        <div className="pageOptions">
          {PAGE_OPTIONS.map(p => (
            <button
              key={p}
              onClick={() => set("targetPages", p)}
              style={{
                background: form.targetPages === p ? "#e8c84a" : "#111",
                color: form.targetPages === p ? "#111" : "rgba(245,245,240,0.52)",
                border: `1px solid ${form.targetPages === p ? "#e8c84a" : "rgba(232,200,74,0.18)"}`,
                borderRadius: "4px",
                padding: "8px 14px",
                fontFamily: "'Courier Prime','Courier New',monospace",
                fontSize: "11px",
                fontWeight: form.targetPages === p ? "bold" : "normal",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                boxShadow: form.targetPages === p ? "0 0 20px rgba(232,200,74,0.22)" : "none",
              }}
            >{p}p</button>
          ))}
        </div>
      </div>

      <div className="fieldBlock large">
        <label className="fieldLabel">Story Premise</label>
        <textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe your story - characters, setting, central conflict, tone. The more detail, the better the AI generates..."
          rows={4}
          style={{ ...inputStyle, resize: "vertical", minHeight: "132px", lineHeight: "1.6" }}
        />
      </div>

      {error && (
        <div className="errorBox">
          {error}
        </div>
      )}

      <div className="actions">
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            flex: 1,
            background: loading ? "#1c1c1e" : "#e8c84a",
            color: loading ? "rgba(245,245,240,0.38)" : "#111",
            border: loading ? "1px solid rgba(232,200,74,0.16)" : "1px solid #e8c84a",
            borderRadius: "4px",
            padding: "15px",
            fontFamily: "'Courier Prime','Courier New',monospace",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 0 30px rgba(232,200,74,0.2)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {loading ? "Creating & Writing..." : "Create Project"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            background: "transparent",
            border: "1px solid rgba(232,200,74,0.22)",
            borderRadius: "4px",
            color: "#e8c84a",
            padding: "15px 22px",
            fontFamily: "'Courier Prime','Courier New',monospace",
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >Cancel</button>
      </div>

      {loading && (
        <div className="loadingNote">
          <span />
          Creating project and generating opening scene...
        </div>
      )}

      <style>{`
        .newProjectScene {
          position: relative;
          max-width: 760px;
          margin: 0 auto;
          padding: 30px;
          background:
            linear-gradient(180deg, rgba(232,200,74,0.04), rgba(22,22,24,0) 44%),
            #161618;
          border: 1px solid rgba(232,200,74,0.22);
          border-top: 3px solid #e8c84a;
          border-radius: 8px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.38), inset 0 0 90px rgba(0,0,0,0.2);
          overflow: hidden;
          font-family: 'Courier Prime','Courier New',monospace;
        }

        .newProjectScene:before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(232,200,74,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,200,74,0.06) 1px, transparent 1px);
          background-size: 58px 58px;
          opacity: 0.22;
        }

        .grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.13;
          background-image:
            radial-gradient(circle at 18% 28%, rgba(245,245,240,0.18) 0 1px, transparent 1px),
            radial-gradient(circle at 72% 64%, rgba(245,245,240,0.12) 0 1px, transparent 1px);
          background-size: 19px 19px, 27px 27px;
        }

        .formHeader,
        .fieldBlock,
        .fieldGrid,
        .actions,
        .errorBox,
        .loadingNote {
          position: relative;
        }

        .formHeader {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 22px;
          padding-bottom: 24px;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(232,200,74,0.16);
        }

        .eyebrow {
          color: #e8c84a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .formHeader h1 {
          color: #f5f5f0;
          font-size: clamp(28px, 5vw, 48px);
          line-height: 0.98;
          letter-spacing: 0;
          text-transform: uppercase;
          margin: 0 0 12px;
        }

        .formHeader p {
          color: rgba(245,245,240,0.5);
          font-size: 12px;
          line-height: 1.65;
          margin: 0;
          max-width: 460px;
        }

        .slate {
          width: 138px;
          min-height: 112px;
          border: 1px solid rgba(232,200,74,0.3);
          border-radius: 5px;
          background: #111;
          overflow: hidden;
          flex: 0 0 auto;
          box-shadow: 0 0 30px rgba(232,200,74,0.1);
        }

        .slateTop {
          height: 34px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          padding: 7px;
          border-bottom: 1px solid rgba(232,200,74,0.24);
        }

        .slateTop span {
          background: repeating-linear-gradient(135deg, #e8c84a 0 7px, #111 7px 14px);
        }

        .slateBody {
          padding: 16px;
        }

        .slateBody span {
          color: rgba(245,245,240,0.42);
          font-size: 8px;
          letter-spacing: 0.2em;
        }

        .slateBody strong {
          display: block;
          color: #e8c84a;
          font-size: 30px;
          line-height: 1;
          margin-top: 8px;
        }

        .fieldBlock {
          margin-bottom: 17px;
        }

        .fieldBlock.large {
          margin-bottom: 22px;
        }

        .fieldGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 17px;
        }

        .fieldLabel {
          display: block;
          color: #e8c84a;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .pageOptions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .pageOptions button:hover,
        .actions button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 0 28px rgba(232,200,74,0.2);
        }

        .errorBox {
          background: #111;
          border: 1px solid rgba(232,200,74,0.36);
          border-left: 3px solid #e8c84a;
          border-radius: 4px;
          color: #e8c84a;
          padding: 12px 14px;
          font-size: 12px;
          margin-bottom: 16px;
          box-shadow: 0 0 22px rgba(232,200,74,0.08);
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .loadingNote {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 16px;
          color: rgba(245,245,240,0.48);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-align: center;
        }

        .loadingNote span {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(232,200,74,0.18);
          border-top-color: #e8c84a;
          border-radius: 50%;
          animation: formSpin 1s linear infinite;
        }

        @keyframes formSpin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 680px) {
          .newProjectScene {
            padding: 22px 16px;
            border-radius: 6px;
          }

          .formHeader {
            flex-direction: column;
          }

          .slate {
            width: 100%;
            min-height: 92px;
          }

          .fieldGrid {
            grid-template-columns: 1fr;
          }

          .actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
