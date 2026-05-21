"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";

// ─── Types ─────────────────────────────────────────────────────────────────

type Block =
  | { type: "heading"; text: string }
  | { type: "action"; text: string }
  | { type: "character"; text: string }
  | { type: "parenthetical"; text: string }
  | { type: "dialogue"; text: string }
  | { type: "transition"; text: string }
  | { type: "blank" };

type Tab = "generate" | "analyze" | "graph" | "rewrite";

interface Character {
  id: string;
  name: string;
  age?: number;
  role: string;
  description: string;
  color: string;
}

interface Relationship {
  source: string;
  target: string;
  type: string;
  label: string;
  strength: number;
}

interface Beat {
  id: string;
  name: string;
  page: number;
  type: string;
  description: string;
  act: number;
}

interface GraphData {
  characters: Character[];
  relationships: Relationship[];
  beats: Beat[];
}

interface Node extends Character {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface HistoryItem {
  id: string;
  tab: Tab;
  title: string;
  preview: string;
  timestamp: Date;
}

// ─── Screenplay Parser ─────────────────────────────────────────────────────

function parseScreenplay(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) { blocks.push({ type: "blank" }); continue; }
    if (/^(INT\.|EXT\.|I\/E\.)/.test(t)) { blocks.push({ type: "heading", text: t }); continue; }
    if (/^(CUT TO:|SMASH CUT TO:|JUMP CUT TO:|DISSOLVE TO:|INTERCUT WITH:|FADE TO BLACK\.|FADE OUT\.|MATCH CUT TO:)$/i.test(t)) { blocks.push({ type: "transition", text: t }); continue; }
    if (/^\(.*\)$/.test(t)) { blocks.push({ type: "parenthetical", text: t }); continue; }
    if (t === t.toUpperCase() && t.length > 1 && /^[A-Z\s'().\/,0-9-]+$/.test(t)) { blocks.push({ type: "character", text: t }); continue; }
    const prev = [...blocks].reverse().find(b => b.type !== "blank");
    if (prev && (prev.type === "character" || prev.type === "parenthetical" || prev.type === "dialogue")) { blocks.push({ type: "dialogue", text: t }); continue; }
    blocks.push({ type: "action", text: t });
  }
  return blocks;
}

// ─── Download Helpers ──────────────────────────────────────────────────────

function downloadTXT(screenplay: string, title: string) {
  const lines = screenplay.split("\n").map(line => {
    const t = line.trim();
    if (!t) return "";
    if (/^(INT\.|EXT\.|I\/E\.)/.test(t)) return t;
    if (/^(CUT TO:|SMASH CUT TO:|JUMP CUT TO:|DISSOLVE TO:|INTERCUT WITH:|FADE TO BLACK\.|FADE OUT\.|MATCH CUT TO:)$/i.test(t)) return " ".repeat(Math.max(0, 60 - t.length)) + t;
    if (/^\(.*\)$/.test(t)) return " ".repeat(25) + t;
    if (t === t.toUpperCase() && t.length > 1 && /^[A-Z\s'().\/,0-9-]+$/.test(t)) return " ".repeat(37) + t;
    return t;
  }).join("\n");
  const slug = title.slice(0, 40).replace(/[^a-z0-9]/gi, "_") || "screenplay";
  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${slug}.txt`; a.click();
  URL.revokeObjectURL(url);
}

function downloadFDX(screenplay: string, title: string) {
  const lines = screenplay.split("\n");
  let paragraphs = ""; const prevTypes: string[] = [];
  for (const line of lines) {
    const t = line.trim(); if (!t) continue;
    let type = "Action";
    if (/^(INT\.|EXT\.|I\/E\.)/.test(t)) type = "Scene Heading";
    else if (/^(CUT TO:|DISSOLVE TO:|FADE TO BLACK\.|FADE OUT\.)$/i.test(t)) type = "Transition";
    else if (/^\(.*\)$/.test(t)) type = "Parenthetical";
    else if (t === t.toUpperCase() && t.length > 1 && /^[A-Z\s'().\/,0-9-]+$/.test(t)) type = "Character";
    else { const prev = prevTypes[prevTypes.length - 1]; if (prev === "Character" || prev === "Parenthetical" || prev === "Dialogue") type = "Dialogue"; }
    prevTypes.push(type);
    const text = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    paragraphs += `    <Paragraph Type="${type}"><Text>${text}</Text></Paragraph>\n`;
  }
  const fdx = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<FinalDraft DocumentType="Script" Template="No" Version="2">\n  <Content>\n${paragraphs}  </Content>\n</FinalDraft>`;
  const slug = title.slice(0, 40).replace(/[^a-z0-9]/gi, "_") || "screenplay";
  const blob = new Blob([fdx], { type: "text/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${slug}.fdx`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Screenplay Page ───────────────────────────────────────────────────────

function ScreenplayPage({ blocks }: { blocks: Block[] }) {
  return (
    <div style={{
      fontFamily: "'Courier Prime','Courier New',Courier,monospace",
      fontSize: "12pt", lineHeight: "1.6", color: "#1a1a1a",
      maxWidth: "680px", margin: "0 auto",
      padding: "clamp(24px, 5vw, 72px) clamp(16px, 6vw, 96px)",
      background: "#fff", boxShadow: "0 4px 40px rgba(0,0,0,0.18)", minHeight: "900px",
    }}>
      {blocks.map((block, i) => {
        if (block.type === "blank") return <div key={i} style={{ height: "12pt" }} />;
        if (block.type === "heading") return <div key={i} style={{ fontWeight: "bold", textTransform: "uppercase", marginTop: "24pt", marginBottom: "12pt", letterSpacing: "0.04em", borderBottom: "1px solid #000", paddingBottom: "4px" }}>{block.text}</div>;
        if (block.type === "action") return <div key={i} style={{ marginBottom: "12pt" }}>{block.text}</div>;
        if (block.type === "character") return <div key={i} style={{ marginLeft: "clamp(40px,25%,200px)", marginTop: "12pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em" }}>{block.text}</div>;
        if (block.type === "parenthetical") return <div key={i} style={{ marginLeft: "clamp(20px,15%,160px)", marginRight: "clamp(20px,15%,160px)", color: "#444", fontStyle: "italic" }}>{block.text}</div>;
        if (block.type === "dialogue") return <div key={i} style={{ marginLeft: "clamp(10px,10%,120px)", marginRight: "clamp(10px,10%,120px)", marginBottom: "12pt" }}>{block.text}</div>;
        if (block.type === "transition") return <div key={i} style={{ textAlign: "right", fontWeight: "bold", textTransform: "uppercase", marginTop: "12pt", marginBottom: "12pt" }}>{block.text}</div>;
        return null;
      })}
    </div>
  );
}

// ─── Download Buttons ──────────────────────────────────────────────────────

function DownloadButtons({ screenplay, title }: { screenplay: string; title: string }) {
  const btn = (label: string, color: string, border: string, fn: () => void) => (
    <button onClick={fn} style={{
      background: "transparent", color, border: `1px solid ${border}`,
      borderRadius: "6px", padding: "8px 12px",
      fontFamily: "'Courier Prime',monospace", fontSize: "11px",
      letterSpacing: "0.06em", textTransform: "uppercase" as const, cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    }}>{label}</button>
  );
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {btn("📋 Copy", "#888", "#333", () => navigator.clipboard.writeText(screenplay))}
      {btn("⬇ .TXT", "#7ec8a4", "#3a6b52", () => downloadTXT(screenplay, title))}
      {btn("🎬 .FDX", "#7aaee8", "#3a5278", () => downloadFDX(screenplay, title))}
    </div>
  );
}

// ─── Spinner ───────────────────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", color: "#666" }}>
      <div style={{ width: "36px", height: "36px", border: "2px solid #333", borderTop: "2px solid #e8c84a", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "14px" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// ─── History Drawer ────────────────────────────────────────────────────────

function HistoryDrawer({ open, onClose, items, onSelect }: {
  open: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}) {
  const tabIcon: Record<Tab, string> = { generate: "✍", analyze: "📄", graph: "🕸", rewrite: "✂" };
  const tabLabel: Record<Tab, string> = { generate: "Write", analyze: "Analyze", graph: "Graph", rewrite: "Rewrite" };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 99, backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(320px, 85vw)",
        background: "#111", borderLeft: "1px solid #2a2a2c",
        zIndex: 100, display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Drawer header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #222",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ color: "#f0f0ea", fontSize: "13px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase" }}>History</div>
            <div style={{ color: "#444", fontSize: "10px", letterSpacing: "0.1em", marginTop: "2px" }}>Recent sessions</div>
          </div>
          <button onClick={onClose} style={{
            background: "#1a1a1c", border: "1px solid #2a2a2c", borderRadius: "6px",
            color: "#666", fontSize: "16px", cursor: "pointer",
            width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}>✕</button>
        </div>

        {/* Coming soon banner */}
        <div style={{
          margin: "12px 16px", padding: "10px 14px",
          background: "#1a1a2a", border: "1px solid #2a2a4a",
          borderRadius: "8px", borderLeft: "3px solid #7aaee8",
        }}>
          <div style={{ color: "#7aaee8", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Coming soon</div>
          <div style={{ color: "#666", fontSize: "11px", lineHeight: "1.5" }}>User history will be saved here across sessions once auth is connected.</div>
        </div>

        {/* History list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
          {items.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎬</div>
              <div style={{ color: "#333", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" }}>No history yet</div>
              <div style={{ color: "#252525", fontSize: "10px", marginTop: "6px" }}>Your work will appear here</div>
            </div>
          ) : (
            items.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelect(item); onClose(); }}
                style={{
                  width: "100%", background: "#1a1a1c", border: "1px solid #222",
                  borderRadius: "8px", padding: "12px 14px", marginBottom: "8px",
                  cursor: "pointer", textAlign: "left", display: "block",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px" }}>{tabIcon[item.tab]}</span>
                  <span style={{ color: "#e8c84a", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{tabLabel[item.tab]}</span>
                  <span style={{ color: "#333", fontSize: "10px", marginLeft: "auto" }}>
                    {item.timestamp.toLocaleDateString()}
                  </span>
                </div>
                <div style={{ color: "#ccc", fontSize: "12px", fontWeight: "bold", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                <div style={{ color: "#555", fontSize: "11px", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{item.preview}</div>
              </button>
            ))
          )}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a1a", color: "#2a2a2a", fontSize: "10px", textAlign: "center", letterSpacing: "0.08em" }}>
          SCREENMASTER · AI SCREENPLAY STUDIO
        </div>
      </div>
    </>
  );
}

// ─── Character Graph ───────────────────────────────────────────────────────

function CharacterGraph({ data }: { data: GraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animFrameRef = useRef<number>(0);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const isDragging = useRef(false);
  const dragNode = useRef<Node | null>(null);
  const [graphView, setGraphView] = useState<"graph" | "list">("graph");

  const W = 800, H = 500;

  const relTypeColor: Record<string, string> = {
    loves: "#D4537E", betrays: "#E24B4A", conflicts: "#EF9F27",
    allies: "#1D9E75", family: "#378ADD", mentor: "#7F77DD",
    rivals: "#BA7517", fears: "#E24B4A", protects: "#1D9E75",
  };

  function hexToRgba(hex: string, a: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  useEffect(() => {
    const chars = data.characters;
    nodesRef.current = chars.map((c, i) => {
      const angle = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(W, H) * 0.3;
      return { ...c, x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle), vx: 0, vy: 0 };
    });
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function tick() {
      const nodes = nodesRef.current;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 4000 / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          nodes[i].vx -= fx; nodes[i].vy -= fy;
          nodes[j].vx += fx; nodes[j].vy += fy;
        }
      }
      for (const rel of data.relationships) {
        const src = nodes.find(n => n.id === rel.source);
        const tgt = nodes.find(n => n.id === rel.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x, dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = 150 + (3 - rel.strength) * 40;
        const force = (dist - ideal) * 0.007;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        src.vx += fx; src.vy += fy; tgt.vx -= fx; tgt.vy -= fy;
      }
      for (const n of nodes) {
        if (dragNode.current?.id === n.id) continue;
        n.vx += (W / 2 - n.x) * 0.003; n.vy += (H / 2 - n.y) * 0.003;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x = Math.max(52, Math.min(W - 52, n.x + n.vx));
        n.y = Math.max(52, Math.min(H - 52, n.y + n.vy));
      }

      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      for (const rel of data.relationships) {
        const src = nodes.find(n => n.id === rel.source);
        const tgt = nodes.find(n => n.id === rel.target);
        if (!src || !tgt) continue;
        const color = relTypeColor[rel.type] || "#888";
        const isHighlighted = hoveredNode === src.id || hoveredNode === tgt.id || selectedNode?.id === src.id || selectedNode?.id === tgt.id;
        const mx = (src.x + tgt.x) / 2 + (tgt.y - src.y) * 0.18;
        const my = (src.y + tgt.y) / 2 - (tgt.x - src.x) * 0.18;
        ctx.save();
        ctx.globalAlpha = isHighlighted ? 0.9 : 0.22;
        ctx.strokeStyle = color;
        ctx.lineWidth = rel.strength * (isHighlighted ? 2.2 : 1.2);
        if (rel.type === "betrays" || rel.type === "fears") ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.quadraticCurveTo(mx, my, tgt.x, tgt.y); ctx.stroke();
        ctx.setLineDash([]);
        if (isHighlighted) {
          const label = rel.label || rel.type;
          ctx.font = "500 11px 'Courier New'";
          const lw = ctx.measureText(label).width;
          ctx.globalAlpha = 0.88; ctx.fillStyle = "#1c1c1e";
          ctx.beginPath(); (ctx as any).roundRect(mx - lw / 2 - 7, my - 10, lw + 14, 19, 5); ctx.fill();
          ctx.globalAlpha = 1; ctx.fillStyle = color;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(label, mx, my);
        }
        ctx.restore();
      }

      for (const node of nodes) {
        const isHov = hoveredNode === node.id;
        const isSel = selectedNode?.id === node.id;
        const r = isSel ? 34 : isHov ? 31 : 27;
        if (isHov || isSel) {
          ctx.save(); ctx.globalAlpha = isSel ? 0.22 : 0.14; ctx.fillStyle = node.color;
          ctx.beginPath(); ctx.arc(node.x, node.y, r + 18, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = node.color;
        ctx.strokeStyle = isSel ? "rgba(255,255,255,0.9)" : hexToRgba(node.color, 0.5);
        ctx.lineWidth = isSel ? 2.5 : 1;
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = `${isSel ? "600" : "500"} ${isSel ? 15 : 13}px 'Courier New'`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(node.name[0], node.x, node.y);
        ctx.font = `${isHov ? "500" : "400"} 11px 'Courier New'`;
        ctx.fillStyle = "#888"; ctx.textBaseline = "top";
        ctx.fillText(node.name.split(" ")[0], node.x, node.y + r + 5);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [data, hoveredNode, selectedNode]);

  const getNodeAt = (cx: number, cy: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = (cx - rect.left) * (W / rect.width);
    const my = (cy - rect.top) * (H / rect.height);
    return nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) < 36) || null;
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    setHoveredNode(node?.id || null);
    if (isDragging.current && dragNode.current) {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      dragNode.current.x = (e.clientX - rect.left) * (W / rect.width);
      dragNode.current.y = (e.clientY - rect.top) * (H / rect.height);
      dragNode.current.vx = 0; dragNode.current.vy = 0;
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) { isDragging.current = true; dragNode.current = node; }
  }, []);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const node = getNodeAt(e.clientX, e.clientY);
    if (node) setSelectedNode(prev => prev?.id === node.id ? null : node);
    dragNode.current = null;
  }, []);

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const node = getNodeAt(t.clientX, t.clientY);
    if (node) { isDragging.current = true; dragNode.current = node; }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging.current || !dragNode.current) return;
    const t = e.touches[0];
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    dragNode.current.x = (t.clientX - rect.left) * (W / rect.width);
    dragNode.current.y = (t.clientY - rect.top) * (H / rect.height);
    dragNode.current.vx = 0; dragNode.current.vy = 0;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const t = e.changedTouches[0];
    const node = getNodeAt(t.clientX, t.clientY);
    if (node) setSelectedNode(prev => prev?.id === node.id ? null : node);
    dragNode.current = null;
  }, []);

  return (
    <div style={{ fontFamily: "'Courier Prime',monospace" }}>
      {/* Mobile toggle: graph vs list */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", justifyContent: "center" }}>
        {(["graph", "list"] as const).map(v => (
          <button key={v} onClick={() => setGraphView(v)} style={{
            background: graphView === v ? "#b07ae8" : "transparent",
            color: graphView === v ? "#111" : "#666",
            border: `1px solid ${graphView === v ? "#b07ae8" : "#2a2a2c"}`,
            borderRadius: "6px", padding: "6px 16px",
            fontFamily: "'Courier Prime',monospace", fontSize: "11px",
            fontWeight: "bold", letterSpacing: "0.06em", textTransform: "uppercase",
            cursor: "pointer", WebkitTapHighlightColor: "transparent",
          }}>
            {v === "graph" ? "🕸 Graph" : "☰ List"}
          </button>
        ))}
      </div>

      {graphView === "graph" && (
        <>
          <canvas
            ref={canvasRef} width={W} height={H}
            style={{
              width: "100%", maxWidth: "800px", display: "block", margin: "0 auto",
              borderRadius: "10px", border: "1px solid #2a2a2c",
              background: "#111", cursor: hoveredNode ? "grab" : "default",
              touchAction: "none",
            }}
            onMouseMove={onMouseMove} onMouseDown={onMouseDown}
            onMouseUp={onMouseUp} onMouseLeave={() => setHoveredNode(null)}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />

          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", maxWidth: "800px", margin: "12px auto 0", justifyContent: "center" }}>
            {Object.entries(relTypeColor)
              .filter(([type]) => data.relationships.some(r => r.type === type))
              .map(([type, color]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "18px", height: "3px", background: color, borderRadius: "2px" }} />
                  <span style={{ color: "#555", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{type}</span>
                </div>
              ))}
          </div>

          <p style={{ textAlign: "center", color: "#2a2a2c", fontSize: "10px", marginTop: "8px", letterSpacing: "0.08em" }}>
            DRAG to reposition · TAP to inspect
          </p>
        </>
      )}

      {/* List view — mobile-friendly fallback */}
      {graphView === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "800px", margin: "0 auto" }}>
          {data.characters.map(char => {
            const rels = data.relationships.filter(r => r.source === char.id || r.target === char.id);
            return (
              <div key={char.id} style={{
                background: "#1a1a1c", border: "1px solid #2a2a2c",
                borderLeft: `3px solid ${char.color}`,
                borderRadius: "8px", padding: "14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                    background: `${char.color}22`, border: `1.5px solid ${char.color}66`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: "600", fontSize: "15px", color: char.color,
                  }}>{char.name[0]}</div>
                  <div>
                    <div style={{ color: char.color, fontWeight: "600", fontSize: "13px" }}>{char.name}</div>
                    <div style={{ color: "#444", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{char.role}</div>
                  </div>
                </div>
                <div style={{ color: "#888", fontSize: "12px", lineHeight: "1.5", marginBottom: rels.length ? "10px" : 0 }}>{char.description}</div>
                {rels.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {rels.map((r, i) => {
                      const other = data.characters.find(c => c.id === (r.source === char.id ? r.target : r.source));
                      const color = relTypeColor[r.type] || "#888";
                      return (
                        <span key={i} style={{
                          fontSize: "10px", padding: "2px 8px", borderRadius: "99px",
                          border: `1px solid ${color}44`, background: `${color}12`, color,
                        }}>
                          {r.type} → {other?.name || "?"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected node detail — for graph view */}
      {graphView === "graph" && selectedNode && (
        <div style={{
          maxWidth: "800px", margin: "14px auto 0",
          background: "#1a1a1c", border: "1px solid #2a2a2c",
          borderRadius: "10px", padding: "16px 20px",
          display: "flex", gap: "14px", alignItems: "flex-start",
        }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
            background: `${selectedNode.color}22`, border: `1.5px solid ${selectedNode.color}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "600", fontSize: "17px", color: selectedNode.color,
          }}>{selectedNode.name[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <span style={{ color: selectedNode.color, fontWeight: "600", fontSize: "14px" }}>
                {selectedNode.name}{selectedNode.age ? ` (${selectedNode.age})` : ""}
              </span>
              <span style={{ color: "#444", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", marginLeft: "8px" }}>{selectedNode.role}</span>
            </div>
            <div style={{ color: "#888", fontSize: "12px", marginTop: "5px", lineHeight: "1.6" }}>{selectedNode.description}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
              {data.relationships
                .filter(r => r.source === selectedNode.id || r.target === selectedNode.id)
                .map((r, i) => {
                  const other = data.characters.find(c => c.id === (r.source === selectedNode.id ? r.target : r.source));
                  const color = relTypeColor[r.type] || "#888";
                  return (
                    <span key={i} style={{
                      fontSize: "11px", padding: "3px 10px", borderRadius: "99px",
                      border: `1px solid ${color}44`, background: `${color}12`, color,
                    }}>
                      {r.type} → {other?.name || "?"}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Beat Sheet ────────────────────────────────────────────────────────────


function BeatSheet({ beats }: { beats: Beat[] }) {
  const [selectedBeat, setSelectedBeat] = useState<Beat | null>(null);
  const [view, setView] = useState<"paper" | "list">("paper");
  const paperRef = useRef<HTMLDivElement>(null);

  const beatColors: Record<string, string> = {
    setup: "#378ADD", inciting: "#BA7517", turning: "#EF9F27",
    midpoint: "#7F77DD", crisis: "#E24B4A", climax: "#D4537E", resolution: "#1D9E75",
  };

  function hexToLight(hex: string, opacity: number) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${opacity})`;
  }

async function downloadPaper() {
  const el = paperRef.current;
  if (!el) return;
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#faf8f3",
    windowWidth: 980,
  });
  const a = document.createElement("a");
  a.download = "beat_sheet.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

  const usedTypes = [...new Set(beats.map(b => b.type))];

  return (
    <div style={{ fontFamily: "'Courier Prime',monospace" }}>
      {/* Load html2canvas */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" />

      {/* Controls row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
        {(["paper","list"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            background: view === v ? "#b07ae8" : "transparent",
            color: view === v ? "#111" : "#666",
            border: `1px solid ${view === v ? "#b07ae8" : "#2a2a2c"}`,
            borderRadius: "6px", padding: "6px 16px",
            fontFamily: "'Courier Prime',monospace", fontSize: "11px",
            fontWeight: "bold", letterSpacing: "0.06em", textTransform: "uppercase" as const,
            cursor: "pointer", WebkitTapHighlightColor: "transparent",
          }}>
            {v === "paper" ? "📄 Paper" : "☰ List"}
          </button>
        ))}
        {view === "paper" && (
          <button onClick={downloadPaper} style={{
            background: "transparent", color: "#7ec8a4", border: "1px solid #3a6b52",
            borderRadius: "6px", padding: "6px 14px",
            fontFamily: "'Courier Prime',monospace", fontSize: "11px",
            letterSpacing: "0.06em", textTransform: "uppercase" as const, cursor: "pointer",
            WebkitTapHighlightColor: "transparent", marginLeft: "auto",
          }}>⬇ Download PNG</button>
        )}
      </div>

      {/* ── PAPER VIEW ── */}
      {view === "paper" && (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
          <div ref={paperRef} style={{
            background: "#faf8f3", minWidth: "700px", maxWidth: "860px", margin: "0 auto",
            borderRadius: "4px", boxShadow: "0 8px 60px rgba(0,0,0,0.45)",
            padding: "48px 52px 52px", fontFamily: "'Courier New',Courier,monospace",
            color: "#1a1a1a", position: "relative",
          }}>
            {/* Red margin line */}
            <div style={{ position: "absolute", left: "72px", top: 0, bottom: 0, width: "1px", background: "rgba(210,140,140,0.35)", pointerEvents: "none" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "2px solid #1a1a1a", paddingBottom: "14px", marginBottom: "28px" }}>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase" }}>Beat Sheet</div>
                <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: "#666", marginTop: "4px" }}>Story Structure Analysis</div>
              </div>
              <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.06em" }}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: "10px" }}>Story Timeline</div>
              <div style={{ position: "relative", height: "40px", background: "#f0ece0", border: "1px solid #ccc", borderRadius: "3px" }}>
                {[25,75].map(p => <div key={p} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: "1px", background: "#bbb" }} />)}
                {[["Act I","3%"],["Act II","28%"],["Act III","78%"]].map(([l,left]) => (
                  <div key={l} style={{ position: "absolute", top: "5px", left, fontSize: "8px", letterSpacing: "0.14em", color: "#aaa", textTransform: "uppercase" }}>{l}</div>
                ))}
                {beats.map(beat => {
                  const color = beatColors[beat.type] || "#888";
                  const isSel = selectedBeat?.id === beat.id;
                  return (
                    <div key={beat.id} onClick={() => setSelectedBeat(p => p?.id === beat.id ? null : beat)}
                      title={beat.name}
                      style={{
                        position: "absolute", left: `${Math.min(97,Math.max(2,beat.page))}%`,
                        top: "50%", transform: `translate(-50%,-50%) scale(${isSel?1.5:1})`,
                        width: "13px", height: "13px", borderRadius: "50%",
                        background: color, border: "2px solid #faf8f3",
                        cursor: "pointer", transition: "transform 0.12s",
                        boxShadow: isSel ? `0 0 0 3px ${hexToLight(color,0.3)}` : "none",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Act columns */}
            <div style={{ display: "flex", gap: "16px" }}>
              {[1,2,3].map(act => (
                <div key={act} style={{ flex: act===2 ? 2 : 1, minWidth: 0 }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#aaa", borderBottom: "1px solid #ddd", paddingBottom: "6px", marginBottom: "10px" }}>Act {act}</div>
                  {beats.filter(b => b.act === act).map(beat => {
                    const color = beatColors[beat.type] || "#888";
                    const isSel = selectedBeat?.id === beat.id;
                    return (
                      <div key={beat.id} onClick={() => setSelectedBeat(p => p?.id === beat.id ? null : beat)}
                        style={{
                          borderLeft: `3px solid ${color}`, padding: "8px 10px", marginBottom: "8px",
                          background: isSel ? "#f5f2e8" : "#fff",
                          borderRadius: "0 3px 3px 0", cursor: "pointer",
                          transition: "background 0.1s", WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <div style={{ display: "inline-block", fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", borderRadius: "99px", padding: "1px 7px", marginBottom: "4px", background: hexToLight(color,0.12), color, border: `1px solid ${hexToLight(color,0.3)}` }}>
                          {beat.type} · p.{beat.page}
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1a1a1a" }}>{beat.name}</div>
                        <div style={{ fontSize: "10px", color: "#666", marginTop: "2px", lineHeight: "1.45" }}>
                          {beat.description.slice(0,70)}{beat.description.length>70?"…":""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Selected detail */}
            {selectedBeat && (() => {
              const color = beatColors[selectedBeat.type] || "#888";
              return (
                <div style={{ marginTop: "24px", borderTop: "1px solid #ddd", paddingTop: "18px" }}>
                  <div style={{ borderLeft: `4px solid ${color}`, padding: "12px 16px", background: "#fff", borderRadius: "0 4px 4px 0" }}>
                    <div style={{ display: "inline-block", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", borderRadius: "99px", padding: "2px 8px", marginBottom: "8px", background: hexToLight(color,0.12), color, border: `1px solid ${hexToLight(color,0.3)}` }}>
                      {selectedBeat.type} · page {selectedBeat.page}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "6px", color: "#1a1a1a" }}>{selectedBeat.name}</div>
                    <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.65" }}>{selectedBeat.description}</div>
                  </div>
                </div>
              );
            })()}

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "28px", paddingTop: "16px", borderTop: "1px solid #e8e4d8" }}>
              {usedTypes.map(type => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: beatColors[type] || "#888", flexShrink: 0 }} />
                  <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>{type}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e8e4d8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#bbb", textTransform: "uppercase" }}>ScreenMaster · AI Screenplay Studio</span>
              <span style={{ fontSize: "9px", color: "#bbb" }}>{beats.length} beats · ~{beats[beats.length-1]?.page || 0} pages</span>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "800px", margin: "0 auto" }}>
          {beats.map(beat => {
            const color = beatColors[beat.type] || "#888";
            return (
              <div key={beat.id} style={{
                background: "#1a1a1c", border: "1px solid #2a2a2c",
                borderLeft: `3px solid ${color}`, borderRadius: "8px", padding: "12px 14px",
              }}>
                <div style={{ display: "inline-block", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "99px", padding: "2px 8px", marginBottom: "6px", color, background: `${color}15`, border: `1px solid ${color}33` }}>
                  {beat.type} · p.{beat.page} · Act {beat.act}
                </div>
                <div style={{ color: "#ddd", fontSize: "13px", fontWeight: "bold" }}>{beat.name}</div>
                <div style={{ color: "#666", fontSize: "12px", marginTop: "4px", lineHeight: "1.5" }}>{beat.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─── Main Component ────────────────────────────────────────────────────────

export default function ScreenplayGenerator() {
  const [tab, setTab] = useState<Tab>("generate");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const addHistory = (tab: Tab, title: string, preview: string) => {
    setHistory(prev => [{
      id: Date.now().toString(), tab, title, preview, timestamp: new Date(),
    }, ...prev].slice(0, 20));
  };

  // Tab 1 — Generate
  const [userRequest, setUserRequest] = useState("");
  const [screenplay, setScreenplay] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tab 2 — Analyze
  const [file, setFile] = useState<File | null>(null);
  const [pastedStory, setPastedStory] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analyzeScreenplay, setAnalyzeScreenplay] = useState("");
  const [analyzeBlocks, setAnalyzeBlocks] = useState<Block[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 3 — Graph
  const [graphScreenplay, setGraphScreenplay] = useState("");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState("");
  const [graphView, setGraphView] = useState<"graph" | "beats">("graph");

  // Tab 4 — Rewrite
  const [rwScene, setRwScene] = useState("");
  const [rwInstruction, setRwInstruction] = useState("");
  const [rwResult, setRwResult] = useState("");
  const [rwNotes, setRwNotes] = useState("");
  const [rwBlocks, setRwBlocks] = useState<Block[]>([]);
  const [rwLoading, setRwLoading] = useState(false);
  const [rwError, setRwError] = useState("");

  const latestScreenplay = analyzeScreenplay || screenplay;

  const generate = async () => {
    if (!userRequest.trim()) return;
    setLoading(true); setError(""); setScreenplay(""); setBlocks([]);
    try {
      const res = await fetch("/api/screenplay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userRequest }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); return; }
      setScreenplay(data.screenplay);
      setBlocks(parseScreenplay(data.screenplay));
      addHistory("generate", userRequest.slice(0, 60), data.screenplay.slice(0, 120));
    } catch { setError("Network error."); } finally { setLoading(false); }
  };

  const analyze = async () => {
    if (!file && !pastedStory.trim()) return;
    setAnalyzing(true); setAnalyzeError(""); setAnalysis(""); setAnalyzeScreenplay(""); setAnalyzeBlocks([]);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file); else formData.append("rawText", pastedStory);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setAnalyzeError(data.error || "Failed."); return; }
      setAnalysis(data.analysis || "");
      setAnalyzeScreenplay(data.screenplay || "");
      setAnalyzeBlocks(parseScreenplay(data.screenplay || ""));
      addHistory("analyze", file?.name || "Pasted story", data.analysis?.slice(0, 120) || "");
    } catch { setAnalyzeError("Network error."); } finally { setAnalyzing(false); }
  };

  const buildGraph = async () => {
    const src = graphScreenplay.trim() || latestScreenplay;
    if (!src) return;
    setGraphLoading(true); setGraphError(""); setGraphData(null);
    try {
      const res = await fetch("/api/graph", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ screenplay: src }) });
      const data = await res.json();
      if (!res.ok) { setGraphError(data.error || "Failed."); return; }
      setGraphData(data);
      addHistory("graph", "Character graph", `${data.characters?.length || 0} characters, ${data.relationships?.length || 0} relationships`);
    } catch { setGraphError("Network error."); } finally { setGraphLoading(false); }
  };

  const rewrite = async () => {
    if (!rwScene.trim() || !rwInstruction.trim()) return;
    setRwLoading(true); setRwError(""); setRwResult(""); setRwNotes(""); setRwBlocks([]);
    try {
      const res = await fetch("/api/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scene: rwScene, instruction: rwInstruction }) });
      const data = await res.json();
      if (!res.ok) { setRwError(data.error || "Failed."); return; }
      setRwResult(data.rewrite || "");
      setRwNotes(data.notes || "");
      setRwBlocks(parseScreenplay(data.rewrite || ""));
      addHistory("rewrite", `Rewrite: ${rwInstruction}`, data.rewrite?.slice(0, 120) || "");
    } catch { setRwError("Network error."); } finally { setRwLoading(false); }
  };

  const TABS: { id: Tab; label: string; short: string }[] = [
    { id: "generate", label: "✍ Write", short: "Write" },
    { id: "analyze", label: "📄 Upload", short: "Upload" },
    { id: "graph", label: "🕸 Graph", short: "Graph" },
    { id: "rewrite", label: "✂ Rewrite", short: "Rewrite" },
  ];

  const INSTRUCTION_PRESETS = [
    "More tense", "More subtext", "Funnier", "More emotional",
    "Faster pacing", "Slower / more cinematic", "More conflict", "Oscar worthy",
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#141416", border: "1px solid #2a2a2c",
    borderRadius: "8px", color: "#f0f0ea", fontSize: "13px",
    fontFamily: "'Courier Prime',monospace", padding: "12px",
    resize: "vertical" as const, outline: "none", boxSizing: "border-box",
  };

  const primaryBtn = (label: string, onClick: () => void, disabled: boolean, color = "#e8c84a"): React.ReactElement => (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#222" : color, color: disabled ? "#444" : "#111",
      border: "none", borderRadius: "8px", padding: "13px 20px",
      fontFamily: "'Courier Prime',monospace", fontSize: "12px", fontWeight: "bold",
      letterSpacing: "0.08em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent",
      transition: "background 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#1c1c1e", fontFamily: "'Courier Prime','Courier New',monospace" }}>

      {/* ── Top bar ── */}
      <div style={{
        background: "#111", borderBottom: "1px solid #1e1e1e",
        padding: "0 16px", height: "52px",
        display: "flex", alignItems: "center", gap: "12px",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <span style={{ fontSize: "18px" }}>🎬</span>
        <span style={{ color: "#f5f5f0", fontSize: "15px", fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase" }}>ScreenMaster</span>
        <span style={{ color: "#333", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", display: "none" as any }}>AI Studio</span>
        <div style={{ flex: 1 }} />
        {/* Burger / history button */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            background: "#1a1a1c", border: "1px solid #2a2a2c",
            borderRadius: "8px", width: "38px", height: "38px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "5px", cursor: "pointer", WebkitTapHighlightColor: "transparent", flexShrink: 0,
          }}
          aria-label="Open history"
        >
          <div style={{ width: "16px", height: "1.5px", background: "#888", borderRadius: "1px" }} />
          <div style={{ width: "16px", height: "1.5px", background: "#888", borderRadius: "1px" }} />
          <div style={{ width: "10px", height: "1.5px", background: "#888", borderRadius: "1px", alignSelf: "flex-start", marginLeft: "3px" }} />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        background: "#111", borderBottom: "1px solid #1e1e1e",
        padding: "0 12px", display: "flex", overflowX: "auto",
        WebkitOverflowScrolling: "touch" as any,
        scrollbarWidth: "none" as any, position: "sticky", top: "52px", zIndex: 49,
      }}>
        <style>{`::-webkit-scrollbar{display:none}`}</style>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "transparent",
              color: tab === t.id ? "#e8c84a" : "#555",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #e8c84a" : "2px solid transparent",
              padding: "14px 16px", flexShrink: 0,
              fontFamily: "'Courier Prime',monospace", fontSize: "11px",
              fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
              transition: "color 0.15s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ══════ TAB 1 — GENERATE ══════ */}
      {tab === "generate" && (
        <>
          <div style={{ padding: "16px", background: "#161618", borderBottom: "1px solid #1e1e1e" }}>
            <label style={{ display: "block", color: "#444", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>Story Idea</label>
            <textarea
              value={userRequest} onChange={e => setUserRequest(e.target.value)}
              placeholder="A thriller about a student in Delhi who downloads classified government data..."
              rows={3} style={inputStyle}
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) generate(); }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {primaryBtn(loading ? "Writing..." : "Generate Script", generate, loading || !userRequest.trim(), "#e8c84a")}
              {screenplay && <DownloadButtons screenplay={screenplay} title={userRequest} />}
            </div>
          </div>
          {error && <div style={{ background: "#2a1212", color: "#ff8080", padding: "10px 16px", fontSize: "12px" }}>⚠ {error}</div>}
          {loading && <Spinner label="Writing your screenplay..." />}
          {!loading && !screenplay && !error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 32px", color: "#2a2a2a" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
              <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Your screenplay will appear here</p>
            </div>
          )}
          {!loading && blocks.length > 0 && (
            <div style={{ padding: "24px 16px", background: "#1e1e20" }}>
              <div style={{ maxWidth: "680px", margin: "0 auto 12px", display: "flex", justifyContent: "space-between", color: "#333", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <span>Draft — {new Date().toLocaleDateString()}</span>
                <span>~{Math.ceil(screenplay.split("\n").filter(l => l.trim()).length / 55)} min</span>
              </div>
              <ScreenplayPage blocks={blocks} />
            </div>
          )}
        </>
      )}

      {/* ══════ TAB 2 — ANALYZE ══════ */}
      {tab === "analyze" && (
        <>
          <div style={{ padding: "16px", background: "#161618", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ color: "#444", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>Upload PDF or TXT — AI analyses and writes a screenplay</div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#e8c84a" : file ? "#7ec8a4" : "#2a2a2c"}`,
                borderRadius: "10px", padding: "20px",
                display: "flex", alignItems: "center", gap: "14px",
                cursor: "pointer", background: "#141416",
                transition: "border-color 0.2s", marginBottom: "12px",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: "28px" }}>{file ? "✅" : "📂"}</span>
              <div>
                <div style={{ color: file ? "#7ec8a4" : "#666", fontSize: "13px", fontWeight: "bold" }}>
                  {file ? file.name : "Drop file or tap to browse"}
                </div>
                <div style={{ color: "#333", fontSize: "10px", marginTop: "2px" }}>PDF, TXT, MD supported</div>
              </div>
              {file && (
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#555", fontSize: "18px", cursor: "pointer" }}
                >✕</button>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
            </div>

            <label style={{ display: "block", color: "#444", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>— or paste story text —</label>
            <textarea
              value={pastedStory} onChange={e => setPastedStory(e.target.value)}
              placeholder="Paste raw story, characters, plot ideas..."
              rows={4} style={inputStyle}
            />
            <div style={{ marginTop: "10px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {primaryBtn(analyzing ? "Analysing..." : "Analyse & Write", analyze, analyzing || (!file && !pastedStory.trim()), "#7ec8a4")}
              {analyzeScreenplay && <DownloadButtons screenplay={analyzeScreenplay} title={file?.name || "story"} />}
            </div>
          </div>

          {analyzeError && <div style={{ background: "#2a1212", color: "#ff8080", padding: "10px 16px", fontSize: "12px" }}>⚠ {analyzeError}</div>}
          {analyzing && <Spinner label="Reading · Analysing · Writing..." />}
          {!analyzing && !analyzeScreenplay && !analyzeError && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 32px", color: "#2a2a2a" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
              <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Upload or paste your story above</p>
            </div>
          )}
          {!analyzing && (analysis || analyzeBlocks.length > 0) && (
            <div style={{ padding: "20px 16px", background: "#1e1e20" }}>
              {analysis && (
                <div style={{ maxWidth: "680px", margin: "0 auto 24px", background: "#121a12", border: "1px solid #1e3a1e", borderRadius: "8px", padding: "16px 20px" }}>
                  <div style={{ color: "#7ec8a4", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #1e3a1e" }}>◆ Story Analysis</div>
                  <pre style={{ color: "#a8d8a8", fontSize: "12px", lineHeight: "1.8", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, overflowX: "auto" }}>{analysis}</pre>
                </div>
              )}
              {analyzeBlocks.length > 0 && <ScreenplayPage blocks={analyzeBlocks} />}
            </div>
          )}
        </>
      )}

      {/* ══════ TAB 3 — GRAPH ══════ */}
      {tab === "graph" && (
        <>
          <div style={{ padding: "16px", background: "#161618", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ color: "#444", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>
              {latestScreenplay ? "Using screenplay from previous tab — paste below to override" : "Paste a screenplay to map characters and beats"}
            </div>
            <textarea
              value={graphScreenplay} onChange={e => setGraphScreenplay(e.target.value)}
              placeholder={latestScreenplay ? "(override: paste different screenplay here)" : "Paste screenplay text here..."}
              rows={3} style={inputStyle}
            />
            <div style={{ marginTop: "10px" }}>
              {primaryBtn(graphLoading ? "Mapping..." : "Build Graph", buildGraph, graphLoading || (!graphScreenplay.trim() && !latestScreenplay), "#b07ae8")}
            </div>
          </div>

          {graphError && <div style={{ background: "#2a1212", color: "#ff8080", padding: "10px 16px", fontSize: "12px" }}>⚠ {graphError}</div>}
          {graphLoading && <Spinner label="Extracting characters · Mapping relationships..." />}

          {!graphLoading && !graphData && !graphError && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 32px", color: "#2a2a2a" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🕸</div>
              <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Character graph will appear here</p>
            </div>
          )}

          {!graphLoading && graphData && (
            <div style={{ padding: "20px 16px", background: "#1e1e20" }}>
              {/* Sub-tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px", justifyContent: "center" }}>
                {(["graph", "beats"] as const).map(v => (
                  <button key={v} onClick={() => setGraphView(v)} style={{
                    background: graphView === v ? "#b07ae8" : "transparent",
                    color: graphView === v ? "#111" : "#666",
                    border: `1px solid ${graphView === v ? "#b07ae8" : "#2a2a2c"}`,
                    borderRadius: "6px", padding: "8px 18px",
                    fontFamily: "'Courier Prime',monospace", fontSize: "11px", fontWeight: "bold",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  }}>
                    {v === "graph" ? "🕸 Graph" : "📊 Beats"}
                  </button>
                ))}
              </div>
              {graphView === "graph" && <CharacterGraph data={graphData} />}
              {graphView === "beats" && <BeatSheet beats={graphData.beats} />}
            </div>
          )}
        </>
      )}

      {/* ══════ TAB 4 — REWRITE ══════ */}
      {tab === "rewrite" && (
        <>
          <div style={{ padding: "16px", background: "#161618", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ color: "#444", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>Paste a scene — tell AI how to rewrite it</div>

            <label style={{ display: "block", color: "#444", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px" }}>Original Scene</label>
            <textarea
              value={rwScene} onChange={e => setRwScene(e.target.value)}
              placeholder="Paste the scene you want to rewrite..."
              rows={6} style={{ ...inputStyle, marginBottom: "12px" }}
            />

            <label style={{ display: "block", color: "#444", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px" }}>Instruction</label>
            <input
              value={rwInstruction} onChange={e => setRwInstruction(e.target.value)}
              placeholder="e.g. make this more tense"
              style={{ ...inputStyle, resize: undefined, marginBottom: "10px" }}
            />

            {/* Preset chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {INSTRUCTION_PRESETS.map(p => (
                <button key={p} onClick={() => setRwInstruction(p)} style={{
                  background: rwInstruction === p ? "#ff994420" : "#141416",
                  color: rwInstruction === p ? "#ff9944" : "#555",
                  border: `1px solid ${rwInstruction === p ? "#ff994466" : "#2a2a2c"}`,
                  borderRadius: "99px", padding: "5px 12px",
                  fontFamily: "'Courier Prime',monospace", fontSize: "11px",
                  cursor: "pointer", WebkitTapHighlightColor: "transparent",
                  transition: "all 0.12s",
                }}>{p}</button>
              ))}
            </div>

            {primaryBtn(rwLoading ? "Rewriting..." : "✂ Rewrite Scene", rewrite, rwLoading || !rwScene.trim() || !rwInstruction.trim(), "#ff9944")}
          </div>

          {rwError && <div style={{ background: "#2a1212", color: "#ff8080", padding: "10px 16px", fontSize: "12px" }}>⚠ {rwError}</div>}
          {rwLoading && <Spinner label="Rewriting scene..." />}

          {!rwLoading && !rwResult && !rwError && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 32px", color: "#2a2a2a" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>✂</div>
              <p style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Rewritten scene will appear here</p>
            </div>
          )}

          {!rwLoading && rwResult && (
            <div style={{ padding: "20px 16px", background: "#1e1e20" }}>
              {rwNotes && (
                <div style={{ maxWidth: "680px", margin: "0 auto 20px", background: "#12121a", border: "1px solid #1e2a3a", borderRadius: "8px", padding: "14px 18px" }}>
                  <div style={{ color: "#7aaee8", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "6px" }}>◆ Script Doctor Notes</div>
                  <p style={{ color: "#8ab4d8", fontSize: "12px", lineHeight: "1.7", margin: 0 }}>{rwNotes}</p>
                </div>
              )}
              <div style={{ maxWidth: "680px", margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#333", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", flexWrap: "wrap", gap: "8px" }}>
                <span>Rewritten — {rwInstruction}</span>
                <DownloadButtons screenplay={rwResult} title={`rewrite_${rwInstruction}`} />
              </div>
              <ScreenplayPage blocks={rwBlocks} />
            </div>
          )}
        </>
      )}

      {/* ── History drawer ── */}
      <HistoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={history}
        onSelect={item => setTab(item.tab)}
      />
    </div>
  );
}