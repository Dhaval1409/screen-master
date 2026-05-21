// src/components/project/ProjectCard.tsx
"use client";

import { useState } from "react";

interface Chunk {
  id: string;
  chunkNumber: number;
  pageEnd: number;
  summary: string;
}

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
  chunks: Chunk[];
}

interface Props {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const GENRE_COLORS: Record<string, string> = {
  "Thriller": "#e8c84a",
  "Horror": "#ff6b6b",
  "Romance": "#e87ab0",
  "Comedy": "#b07ae8",
  "Drama": "#7aaee8",
  "Action": "#ff9944",
  "Sci-Fi": "#7ec8a4",
  "Mystery": "#e8c84a",
  "Fantasy": "#b07ae8",
};

export function ProjectCard({ project, onOpen, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const lastChunk = project.chunks[project.chunks.length - 1];
  const currentPage = lastChunk?.pageEnd || 0;
  const progress = Math.min(100, Math.round((currentPage / project.targetPages) * 100));
  const genreColor = GENRE_COLORS[project.genre] || "#888";
  const isComplete = project.status === "completed";

  const statusLabel = isComplete
    ? "Complete"
    : project.status === "archived"
    ? "Archived"
    : `${currentPage}/${project.targetPages} pages`;

  return (
    <div style={{
      background: "#1a1a1c",
      border: "1px solid #2a2a2c",
      borderTop: `3px solid ${genreColor}`,
      borderRadius: "10px",
      padding: "18px 20px",
      cursor: "pointer",
      transition: "border-color 0.15s, transform 0.1s",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
      onClick={() => onOpen(project.id)}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: "#f0f0ea",
            fontSize: "15px",
            fontWeight: "bold",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>{project.title}</div>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", color: genreColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>{project.genre}</span>
            <span style={{ fontSize: "10px", color: "#444" }}>·</span>
            <span style={{ fontSize: "10px", color: "#555", textTransform: "capitalize" }}>{project.storyType}</span>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
          style={{
            background: "transparent",
            border: "none",
            color: "#333",
            fontSize: "14px",
            cursor: "pointer",
            padding: "2px 6px",
            flexShrink: 0,
          }}
          title="Delete project"
        >✕</button>
      </div>

      {/* Description */}
      <div style={{
        color: "#555",
        fontSize: "12px",
        lineHeight: "1.5",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as any,
        overflow: "hidden",
      }}>{project.description}</div>

      {/* Progress bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ color: "#444", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {isComplete ? "✓ Complete" : `${project.chunks.length} chunk${project.chunks.length !== 1 ? "s" : ""}`}
          </span>
          <span style={{ color: isComplete ? "#7ec8a4" : genreColor, fontSize: "10px", fontWeight: "bold" }}>
            {statusLabel}
          </span>
        </div>
        <div style={{ height: "3px", background: "#222", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: isComplete ? "#7ec8a4" : genreColor,
            borderRadius: "2px",
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {/* Last activity */}
      {lastChunk && (
        <div style={{
          background: "#141416",
          border: "1px solid #1e1e1e",
          borderRadius: "6px",
          padding: "8px 10px",
        }}>
          <div style={{ color: "#333", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px" }}>Last scene</div>
          <div style={{ color: "#666", fontSize: "11px", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
            {lastChunk.summary}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: "#2a1a1a",
            border: "1px solid #4a2a2a",
            borderRadius: "6px",
            padding: "10px 12px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#ff8080", fontSize: "11px", flex: 1 }}>Delete this project?</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(project.id); }}
            style={{ background: "#ff4444", border: "none", borderRadius: "4px", color: "#fff", fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}
          >Delete</button>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
            style={{ background: "transparent", border: "1px solid #444", borderRadius: "4px", color: "#888", fontSize: "11px", padding: "4px 10px", cursor: "pointer" }}
          >Cancel</button>
        </div>
      )}
    </div>
  );
}