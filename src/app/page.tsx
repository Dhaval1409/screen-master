// src/app/page.tsx
// Main entry — project dashboard + editor
"use client";

import { useState, useEffect } from "react";
import { ProjectCard } from "@/components/project/ProjectCard";
import { NewProjectForm } from "@/components/project/NewProjectForm";
import { StoryEditor } from "@/components/editor/StoryEditor";

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
  chunks: any[];
}

type View = "dashboard" | "new" | "editor";

export default function HomePage() {
  const [view, setView] = useState<View>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Load all projects on mount
  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => setProjects(data.projects || []))
      .catch(console.error)
      .finally(() => setLoadingProjects(false));
  }, []);

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [project, ...prev]);
    setActiveProjectId(project.id);
    setView("editor");
  };

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setView("editor");
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch { console.error("Delete failed"); }
  };

  // ── Editor view ──
  if (view === "editor" && activeProjectId) {
    return (
      <StoryEditor
        projectId={activeProjectId}
        onBack={() => {
          setView("dashboard");
          // Refresh project list on return
          fetch("/api/projects")
            .then(r => r.json())
            .then(data => setProjects(data.projects || []));
        }}
      />
    );
  }

  // ── New project view ──
  if (view === "new") {
    return (
      <div style={{ minHeight: "100vh", background: "#1c1c1e", fontFamily: "'Courier Prime','Courier New',monospace" }}>
        <div style={{ background: "#111", borderBottom: "1px solid #1e1e1e", padding: "0 16px", height: "52px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50 }}>
          <button onClick={() => setView("dashboard")} style={{ background: "transparent", border: "none", color: "#666", fontSize: "18px", cursor: "pointer" }}>←</button>
          <span style={{ color: "#f5f5f0", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase" }}>🎬 ScreenMaster</span>
        </div>
        <div style={{ padding: "32px 16px" }}>
          <NewProjectForm
            onCreated={handleProjectCreated}
            onCancel={() => setView("dashboard")}
          />
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div style={{ minHeight: "100vh", background: "#1c1c1e", fontFamily: "'Courier Prime','Courier New',monospace" }}>

      {/* Top bar */}
      <div style={{
        background: "#111", borderBottom: "1px solid #1e1e1e",
        padding: "0 20px", height: "56px",
        display: "flex", alignItems: "center", gap: "12px",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <span style={{ fontSize: "20px" }}>🎬</span>
        <div>
          <div style={{ color: "#f5f5f0", fontSize: "15px", fontWeight: "bold", letterSpacing: "0.08em", textTransform: "uppercase" }}>ScreenMaster</div>
          <div style={{ color: "#333", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" }}>AI Screenplay Studio</div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setView("new")}
          style={{
            background: "#e8c84a", color: "#111",
            border: "none", borderRadius: "8px",
            padding: "10px 18px",
            fontFamily: "'Courier Prime',monospace",
            fontSize: "11px", fontWeight: "bold",
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer",
          }}
        >+ New Project</button>
      </div>

      {/* Dashboard body */}
      <div style={{ padding: "24px 20px", maxWidth: "900px", margin: "0 auto" }}>

        {/* Stats bar */}
        {!loadingProjects && projects.length > 0 && (
          <div style={{
            display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap",
          }}>
            {[
              ["Total Projects", projects.length],
              ["Active", projects.filter(p => p.status === "active").length],
              ["Complete", projects.filter(p => p.status === "completed").length],
              ["Total Pages", projects.reduce((acc, p) => acc + (p.chunks[p.chunks.length - 1]?.pageEnd || 0), 0)],
            ].map(([label, val]) => (
              <div key={label as string} style={{
                background: "#161618", border: "1px solid #2a2a2c",
                borderRadius: "8px", padding: "12px 16px", flex: 1, minWidth: "100px",
              }}>
                <div style={{ color: "#e8c84a", fontSize: "18px", fontWeight: "bold" }}>{val}</div>
                <div style={{ color: "#444", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Projects heading */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ color: "#555", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            {loadingProjects ? "Loading..." : `${projects.length} Project${projects.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Loading */}
        {loadingProjects && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: "#333" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "32px", height: "32px", border: "2px solid #222", borderTop: "2px solid #e8c84a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading projects...</div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loadingProjects && projects.length === 0 && (
          <div style={{
            textAlign: "center", padding: "80px 32px",
            background: "#161618", border: "1px dashed #2a2a2c",
            borderRadius: "12px",
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📽</div>
            <div style={{ color: "#555", fontSize: "13px", letterSpacing: "0.08em", marginBottom: "8px" }}>
              No projects yet
            </div>
            <div style={{ color: "#333", fontSize: "11px", marginBottom: "24px" }}>
              Create your first screenplay project and the AI will start writing it for you
            </div>
            <button
              onClick={() => setView("new")}
              style={{
                background: "#e8c84a", color: "#111",
                border: "none", borderRadius: "8px",
                padding: "12px 24px",
                fontFamily: "'Courier Prime',monospace",
                fontSize: "12px", fontWeight: "bold",
                letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer",
              }}
            >+ Create First Project</button>
          </div>
        )}

        {/* Project grid */}
        {!loadingProjects && projects.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "14px",
          }}>
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "32px 20px", textAlign: "center", color: "#252525", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
        ScreenMaster · AI Screenplay Studio · Built with Next.js + LangChain + Gemini
      </div>
    </div>
  );
}