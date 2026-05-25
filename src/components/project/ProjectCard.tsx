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

export function ProjectCard({ project, onOpen, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState(false);

  const lastChunk = project.chunks[project.chunks.length - 1];
  const currentPage = lastChunk?.pageEnd || 0;
  const progress = Math.min(100, Math.round((currentPage / project.targetPages) * 100));
  const isComplete = project.status === "completed";
  const isArchived = project.status === "archived";

  const statusLabel = isComplete
    ? "COMPLETE"
    : isArchived
    ? "ARCHIVED"
    : `${currentPage} / ${project.targetPages} PAGES`;

  const dateStr = new Date(project.updatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).toUpperCase();

  return (
    <div
      onClick={() => onOpen(project.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#1c1c1e" : "#161618",
        border: `1px solid ${hovered ? "rgba(232,200,74,0.42)" : "rgba(232,200,74,0.16)"}`,
        borderTop: "3px solid #e8c84a",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        boxShadow: hovered
          ? "0 22px 48px rgba(0,0,0,0.34), 0 0 34px rgba(232,200,74,0.12)"
          : "0 10px 28px rgba(0,0,0,0.22)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        fontFamily: "'Courier Prime','Courier New',monospace",
      }}
    >
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: hovered ? 0.18 : 0.1,
        backgroundImage: "linear-gradient(rgba(232,200,74,0.16) 1px, transparent 1px)",
        backgroundSize: "100% 30px",
      }} />

      <div style={{
        padding: "13px 16px",
        borderBottom: "1px solid rgba(232,200,74,0.13)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#111",
        flexShrink: 0,
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
          <div style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            flexShrink: 0,
            background: isArchived ? "#1c1c1e" : "#e8c84a",
            border: "1px solid rgba(232,200,74,0.7)",
            boxShadow: isComplete || hovered ? "0 0 10px rgba(232,200,74,0.45)" : "none",
          }} />
          <span style={{
            color: "#e8c84a",
            fontSize: "9px",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}>{project.genre}</span>
          <span style={{ color: "rgba(245,245,240,0.28)", fontSize: "9px", flexShrink: 0 }}>·</span>
          <span style={{
            color: "rgba(245,245,240,0.46)",
            fontSize: "9px",
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>{project.storyType}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{ color: "rgba(245,245,240,0.32)", fontSize: "8px", whiteSpace: "nowrap" }}>
            {dateStr}
          </span>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
            title="Delete project"
            style={{
              background: "transparent",
              border: "none",
              color: hovered ? "#e8c84a" : "rgba(245,245,240,0.34)",
              fontSize: "14px",
              cursor: "pointer",
              padding: "0 2px",
              lineHeight: "1",
              transition: "color 0.15s",
              flexShrink: 0,
              fontFamily: "'Courier Prime','Courier New',monospace",
            }}
          >x</button>
        </div>
      </div>

      <div style={{ padding: "20px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "14px", position: "relative" }}>
        <div style={{
          fontSize: "18px",
          fontWeight: "900",
          color: hovered ? "#fff" : "#f5f5f0",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          lineHeight: "1.12",
          transition: "color 0.2s",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>{project.title}</div>

        <div style={{
          color: "rgba(245,245,240,0.52)",
          fontSize: "12px",
          lineHeight: "1.6",
          fontStyle: "italic",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{project.description}</div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px", alignItems: "center", gap: "10px" }}>
            <span style={{
              color: "rgba(245,245,240,0.4)",
              fontSize: "8px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}>
              {isComplete
                ? "COMPLETE"
                : isArchived
                ? "ARCHIVED"
                : `${project.chunks.length} CHUNK${project.chunks.length !== 1 ? "S" : ""}`}
            </span>
            <span style={{
              color: "#e8c84a",
              fontSize: "8px",
              fontWeight: "bold",
              letterSpacing: "0.13em",
              whiteSpace: "nowrap",
            }}>{statusLabel}</span>
          </div>
          <div style={{ height: "3px", background: "#111", borderRadius: "2px", overflow: "hidden", position: "relative" }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background: "#e8c84a",
              borderRadius: "2px",
              transition: "width 0.5s ease",
              boxShadow: hovered ? "0 0 12px rgba(232,200,74,0.55)" : "none",
            }} />
          </div>
        </div>

        {lastChunk && (
          <div style={{
            background: "#111",
            border: "1px solid rgba(232,200,74,0.12)",
            borderLeft: "2px solid #e8c84a",
            padding: "10px 11px",
            borderRadius: "4px",
          }}>
            <div style={{
              color: "#e8c84a",
              fontSize: "8px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: "5px",
            }}>LAST SCENE</div>
            <div style={{
              color: "rgba(245,245,240,0.46)",
              fontSize: "10px",
              lineHeight: "1.5",
              fontStyle: "italic",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>{lastChunk.summary}</div>
          </div>
        )}
      </div>

      <div style={{
        padding: "11px 16px",
        borderTop: "1px solid rgba(232,200,74,0.13)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: hovered ? "#111" : "transparent",
        transition: "background 0.2s",
        flexShrink: 0,
        position: "relative",
      }}>
        <span style={{
          color: hovered ? "#e8c84a" : "rgba(245,245,240,0.44)",
          fontSize: "9px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          transition: "color 0.2s",
        }}>
          {isComplete ? "VIEW SCREENPLAY" : isArchived ? "VIEW PROJECT" : "CONTINUE WRITING"}
        </span>
        <span style={{
          color: hovered ? "#e8c84a" : "rgba(245,245,240,0.36)",
          fontSize: "14px",
          transition: "color 0.2s",
        }}>{"->"}</span>
      </div>

      {confirmDelete && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(17,17,17,0.97)",
            border: "1px solid rgba(232,200,74,0.38)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            padding: "24px",
            zIndex: 10,
          }}
        >
          <div style={{
            color: "#e8c84a",
            fontSize: "9px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}>
            DELETE THIS PROJECT?
          </div>
          <div style={{
            color: "rgba(245,245,240,0.68)",
            fontSize: "11px",
            textAlign: "center",
            lineHeight: "1.6",
          }}>
            &quot;{project.title}&quot;<br />
            <span style={{ color: "rgba(245,245,240,0.42)", fontSize: "10px" }}>
              {project.chunks.length} chunk{project.chunks.length !== 1 ? "s" : ""} · {currentPage} pages written
            </span><br />
            <span style={{ color: "rgba(245,245,240,0.34)", fontSize: "10px" }}>This cannot be undone.</span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={e => { e.stopPropagation(); onDelete(project.id); }}
              style={{
                background: "#e8c84a",
                color: "#111",
                border: "1px solid #e8c84a",
                borderRadius: "3px",
                padding: "8px 18px",
                fontFamily: "'Courier Prime','Courier New',monospace",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >DELETE</button>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{
                background: "transparent",
                color: "#e8c84a",
                border: "1px solid rgba(232,200,74,0.38)",
                borderRadius: "3px",
                padding: "8px 18px",
                fontFamily: "'Courier Prime','Courier New',monospace",
                fontSize: "9px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}
