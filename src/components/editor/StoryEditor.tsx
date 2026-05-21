// src/components/editor/StoryEditor.tsx
"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Block =
  | { type: "heading"; text: string }
  | { type: "action"; text: string }
  | { type: "character"; text: string }
  | { type: "parenthetical"; text: string }
  | { type: "dialogue"; text: string }
  | { type: "transition"; text: string }
  | { type: "blank" };

interface Chunk {
  id: string;
  chunkNumber: number;
  content: string;
  pageStart: number;
  pageEnd: number;
  summary: string;
  sceneCount: number;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  genre: string;
  storyType: string;
  targetPages: number;
  description: string;
  status: string;
  chunks: Chunk[];
}

interface Props {
  projectId: string;
  onBack: () => void;
}

// ─── Screenplay Parser ──────────────────────────────────────────────────────
function cleanLine(line: string): string {
  return line
    .replace(/<center>/gi, "")
    .replace(/<\/center>/gi, "")
    .replace(/^>\s*/, "")
    .replace(/<b>/gi, "").replace(/<\/b>/gi, "")
    .replace(/<i>/gi, "").replace(/<\/i>/gi, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();
}
function parseScreenplay(raw: string): Block[] {
  const blocks: Block[] = [];
  for (const line of raw.split("\n")) {
    const t = cleanLine(line);
    if (!t) { blocks.push({ type: "blank" }); continue; }
    if (/^(INT\.|EXT\.|I\/E\.)/.test(t)) { blocks.push({ type: "heading", text: t }); continue; }
    if (/^(FADE IN:|FADE OUT\.|FADE TO BLACK\.|CUT TO:|SMASH CUT TO:|JUMP CUT TO:|DISSOLVE TO:|INTERCUT WITH:|MATCH CUT TO:)$/i.test(t)) { blocks.push({ type: "transition", text: t }); continue; }
    if (/^\(.*\)$/.test(t)) { blocks.push({ type: "parenthetical", text: t }); continue; }
    if (t === t.toUpperCase() && t.length > 1 && /^[A-Z\s'().\/,0-9-]+$/.test(t)) { blocks.push({ type: "character", text: t }); continue; }
    const prev = [...blocks].reverse().find(b => b.type !== "blank");
    if (prev && (prev.type === "character" || prev.type === "parenthetical" || prev.type === "dialogue")) { blocks.push({ type: "dialogue", text: t }); continue; }
    blocks.push({ type: "action", text: t });
  }
  return blocks;
}

// ─── Screenplay Page ────────────────────────────────────────────────────────

function ScreenplayPage({ content, chunkNumber, pageStart, pageEnd }: {
  content: string;
  chunkNumber: number;
  pageStart: number;
  pageEnd: number;
}) {
  const blocks = parseScreenplay(content);

  return (
    <div style={{ marginBottom: "0" }}>
      {/* Chunk separator (except first) */}
      {chunkNumber > 1 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          margin: "0", padding: "6px 0",
          background: "#f5f3ee",
        }}>
          <div style={{ flex: 1, height: "1px", background: "#e0ddd5" }} />
          <span style={{ color: "#bbb", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            p. {pageStart}
          </span>
          <div style={{ flex: 1, height: "1px", background: "#e0ddd5" }} />
        </div>
      )}

      {/* Script content */}
      <div style={{
        fontFamily: "'Courier Prime','Courier New',Courier,monospace",
        fontSize: "12pt",
        lineHeight: "1.6",
        color: "#1a1a1a",
        padding: "0 96px",
        background: "#fff",
      }}>
        {blocks.map((block, i) => {
          if (block.type === "blank") return <div key={i} style={{ height: "12pt" }} />;
          if (block.type === "heading") return <div key={i} style={{ fontWeight: "bold", textTransform: "uppercase", marginTop: "24pt", marginBottom: "12pt", letterSpacing: "0.04em", borderBottom: "1px solid #1a1a1a", paddingBottom: "3px" }}>{block.text}</div>;
          if (block.type === "action") return <div key={i} style={{ marginBottom: "12pt" }}>{block.text}</div>;
          if (block.type === "character") return <div key={i} style={{ marginLeft: "200px", marginTop: "12pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em" }}>{block.text}</div>;
          if (block.type === "parenthetical") return <div key={i} style={{ marginLeft: "160px", marginRight: "160px", color: "#444", fontStyle: "italic" }}>{block.text}</div>;
          if (block.type === "dialogue") return <div key={i} style={{ marginLeft: "120px", marginRight: "120px", marginBottom: "12pt" }}>{block.text}</div>;
          if (block.type === "transition") return <div key={i} style={{ textAlign: "right", fontWeight: "bold", textTransform: "uppercase", marginTop: "12pt", marginBottom: "12pt" }}>{block.text}</div>;
          return null;
        })}
      </div>
    </div>
  );
}

// ─── Main StoryEditor ───────────────────────────────────────────────────────

export function StoryEditor({ projectId, onBack }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState("");
  const [continueError, setContinueError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load project
  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(data => { setProject(data.project); })
      .catch(() => setError("Failed to load project."))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Auto-scroll to bottom when new chunk arrives
  useEffect(() => {
    if (!loading && project) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [project?.chunks.length]);

  const handleContinue = async () => {
    setContinuing(true);
    setContinueError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/continue`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setContinueError(data.error || "Failed to continue.");
        return;
      }
      // Reload project to get new chunk
      const refreshed = await fetch(`/api/projects/${projectId}`).then(r => r.json());
      setProject(refreshed.project);
    } catch {
      setContinueError("Network error. Try again.");
    } finally {
      setContinuing(false);
    }
  };

  const handleExport = (format: "txt" | "fdx") => {
    window.open(`/api/projects/${projectId}/export?format=${format}`, "_blank");
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#555", fontFamily: "monospace" }}>
      <div>
        <div style={{ width: "36px", height: "36px", border: "2px solid #333", borderTop: "2px solid #e8c84a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center" }}>Loading screenplay...</div>
      </div>
    </div>
  );

  if (error || !project) return (
    <div style={{ padding: "40px", color: "#ff8080", fontFamily: "monospace" }}>⚠ {error || "Project not found"}</div>
  );

  const lastChunk = project.chunks[project.chunks.length - 1];
  const currentPage = lastChunk?.pageEnd || 0;
  const progress = Math.min(100, Math.round((currentPage / project.targetPages) * 100));
  const isComplete = project.status === "completed" || currentPage >= project.targetPages;

  return (
    <div style={{ minHeight: "100vh", background: "#1c1c1e", fontFamily: "'Courier Prime','Courier New',monospace" }}>

      {/* ── Editor top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#111", borderBottom: "1px solid #1e1e1e",
        padding: "0 16px", height: "52px",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button
          onClick={onBack}
          style={{ background: "transparent", border: "none", color: "#666", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}
        >←</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#f0f0ea", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {project.title}
          </div>
          <div style={{ color: "#444", fontSize: "10px", letterSpacing: "0.08em" }}>
            {project.genre} · {currentPage}/{project.targetPages}p · {project.chunks.length} chunks
          </div>
        </div>

        {/* Progress pill */}
        <div style={{
          background: "#1a1a1c", border: "1px solid #2a2a2c",
          borderRadius: "99px", padding: "4px 12px",
          display: "flex", alignItems: "center", gap: "8px",
          flexShrink: 0,
        }}>
          <div style={{ width: "60px", height: "4px", background: "#222", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: isComplete ? "#7ec8a4" : "#e8c84a", borderRadius: "2px", transition: "width 0.4s" }} />
          </div>
          <span style={{ color: isComplete ? "#7ec8a4" : "#e8c84a", fontSize: "10px", fontWeight: "bold" }}>{progress}%</span>
        </div>

        {/* Export */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => handleExport("txt")} style={{ background: "transparent", border: "1px solid #2a2a2c", borderRadius: "6px", color: "#7ec8a4", fontSize: "10px", padding: "6px 10px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>⬇ TXT</button>
          <button onClick={() => handleExport("fdx")} style={{ background: "transparent", border: "1px solid #2a2a2c", borderRadius: "6px", color: "#7aaee8", fontSize: "10px", padding: "6px 10px", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>🎬 FDX</button>
        </div>
      </div>

      {/* ── Screenplay paper ── */}
      <div style={{ padding: "32px 0 0", background: "#2a2a2c" }}>

        {/* Title page header */}
        <div style={{
          maxWidth: "680px", margin: "0 auto",
          background: "#fff",
          padding: "48px 96px 24px",
          fontFamily: "'Courier Prime',monospace",
          textAlign: "center",
          boxShadow: "0 4px 40px rgba(0,0,0,0.2)",
        }}>
          <div style={{ fontSize: "18pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            {project.title}
          </div>
          <div style={{ fontSize: "11pt", color: "#888" }}>
            {project.genre} {project.storyType}
          </div>
          <div style={{ fontSize: "10pt", color: "#aaa", marginTop: "4px" }}>
            Written with ScreenMaster AI
          </div>
          <div style={{ marginTop: "24px", height: "1px", background: "#ddd" }} />
        </div>

        {/* Chunks */}
        {project.chunks.map(chunk => (
          <div
            key={chunk.id}
            style={{
              maxWidth: "680px", margin: "0 auto",
              background: "#fff",
              boxShadow: "0 4px 40px rgba(0,0,0,0.2)",
            }}
          >
            <ScreenplayPage
              content={chunk.content}
              chunkNumber={chunk.chunkNumber}
              pageStart={chunk.pageStart}
              pageEnd={chunk.pageEnd}
            />
          </div>
        ))}

        {/* Bottom of screenplay */}
        <div
          ref={bottomRef}
          style={{
            maxWidth: "680px", margin: "0 auto",
            background: "#fff",
            padding: "24px 96px 60px",
            boxShadow: "0 4px 40px rgba(0,0,0,0.2)",
          }}
        >
          {isComplete ? (
            <div style={{ textAlign: "center", borderTop: "2px solid #1a1a1a", paddingTop: "32px" }}>
              <div style={{ fontSize: "14pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>FADE OUT.</div>
              <div style={{ fontSize: "11pt", color: "#888" }}>THE END</div>
              <div style={{ fontSize: "9pt", color: "#bbb", marginTop: "16px", letterSpacing: "0.1em" }}>
                {currentPage} pages · {project.chunks.length} scenes
              </div>
            </div>
          ) : (
            <div style={{ borderTop: "1px dashed #ddd", paddingTop: "24px", textAlign: "center" }}>
              <div style={{ color: "#aaa", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                Page {currentPage} of {project.targetPages}
              </div>
              <div style={{ color: "#ccc", fontSize: "11px", fontStyle: "italic" }}>
                — continue —
              </div>
            </div>
          )}
        </div>

        {/* ── Continue button bar ── */}
        {!isComplete && (
          <div style={{
            position: "sticky", bottom: 0,
            background: "rgba(17,17,17,0.96)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid #222",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            zIndex: 40,
          }}>
            {/* Progress */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#444", fontSize: "10px", letterSpacing: "0.1em" }}>STORY PROGRESS</span>
                <span style={{ color: "#e8c84a", fontSize: "10px", fontWeight: "bold" }}>
                  {currentPage} / {project.targetPages} pages
                </span>
              </div>
              <div style={{ height: "3px", background: "#222", borderRadius: "2px" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#e8c84a", borderRadius: "2px", transition: "width 0.4s" }} />
              </div>
            </div>

            {/* Story structure hint */}
            <div style={{ color: "#333", fontSize: "10px", letterSpacing: "0.06em", textAlign: "center", display: "none" }}>
              {getStoryPosition(currentPage, project.targetPages)}
            </div>

            {/* Continue button */}
            <button
              onClick={handleContinue}
              disabled={continuing}
              style={{
                background: continuing ? "#333" : "#e8c84a",
                color: continuing ? "#666" : "#111",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontFamily: "'Courier Prime',monospace",
                fontSize: "13px",
                fontWeight: "bold",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: continuing ? "not-allowed" : "pointer",
                flexShrink: 0,
                minWidth: "160px",
                transition: "background 0.15s",
              }}
            >
              {continuing ? "Writing..." : "▶ Continue Story"}
            </button>
          </div>
        )}

        {/* Completion bar */}
        {isComplete && (
          <div style={{
            position: "sticky", bottom: 0,
            background: "rgba(17,17,17,0.96)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid #222",
            padding: "14px 20px",
            display: "flex", alignItems: "center", gap: "16px",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#7ec8a4", fontSize: "12px", fontWeight: "bold", letterSpacing: "0.06em" }}>
                ✓ Screenplay Complete — {currentPage} pages
              </div>
              <div style={{ color: "#444", fontSize: "10px", marginTop: "2px" }}>
                {project.chunks.length} chunks · ~{currentPage} minutes
              </div>
            </div>
            <button onClick={() => handleExport("txt")} style={{ background: "#7ec8a4", color: "#111", border: "none", borderRadius: "8px", padding: "10px 20px", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ⬇ Download TXT
            </button>
            <button onClick={() => handleExport("fdx")} style={{ background: "#7aaee8", color: "#111", border: "none", borderRadius: "8px", padding: "10px 20px", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              🎬 Download FDX
            </button>
          </div>
        )}

        {continueError && (
          <div style={{
            position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)",
            background: "#2a1212", border: "1px solid #4a2222",
            borderRadius: "8px", color: "#ff8080",
            padding: "10px 20px", fontSize: "12px",
            zIndex: 60, whiteSpace: "nowrap",
          }}>
            ⚠ {continueError}
          </div>
        )}
      </div>
    </div>
  );
}

function getStoryPosition(current: number, total: number): string {
  const p = current / total;
  if (p < 0.25) return "Act I";
  if (p < 0.75) return "Act II";
  return "Act III";
}