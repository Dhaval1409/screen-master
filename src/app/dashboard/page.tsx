// src/app/dashboard/page.tsx
// Project dashboard + editor
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
  chunks: {
    id: string;
    chunkNumber: number;
    pageEnd: number;
    summary: string;
  }[];
}

type View = "dashboard" | "new" | "editor";

export default function DashboardPage() {
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

  // Editor view
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

  // New project view
  if (view === "new") {
    return (
      <div style={{ minHeight: "100vh", background: "#1c1c1e", fontFamily: "'Courier Prime','Courier New',monospace", color: "#f5f5f0" }}>
        <div style={{
          background: "#111",
          borderBottom: "1px solid rgba(232,200,74,0.22)",
          padding: "0 20px",
          minHeight: "72px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 14px 34px rgba(0,0,0,0.26)",
        }}>
          <button onClick={() => setView("dashboard")} style={{ background: "transparent", border: "1px solid rgba(232,200,74,0.34)", borderRadius: "4px", color: "#e8c84a", fontSize: "17px", cursor: "pointer", width: "38px", height: "38px", fontFamily: "'Courier Prime','Courier New',monospace" }}>{"<"}</button>
          <span style={{ color: "#f5f5f0", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.12em", textTransform: "uppercase" }}>ScreenMaster</span>
        </div>
        <div style={{ padding: "40px 16px" }}>
          <NewProjectForm
            onCreated={handleProjectCreated}
            onCancel={() => setView("dashboard")}
          />
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="dashboardShell">

      {/* Top bar */}
      <div className="topBar">
        <div className="brandBlock">
          <span className="brandMark" aria-hidden="true" />
          <div>
            <div className="brandName">ScreenMaster</div>
            <div className="brandSub">AI Screenplay Studio</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setView("new")}
          className="primaryButton"
        >+ New Project</button>
      </div>

      {/* Dashboard body */}
      <div className="dashboardBody">
        <div className="dashboardHeader">
          <div>
            <div className="kicker">Writer&apos;s Room</div>
            <h1>Your Screenplays</h1>
            <p>Draft, format, and manage every story from one cinematic desk.</p>
          </div>
          <div className="clapper" aria-hidden="true">
            <div className="clapperTop">
              <span />
              <span />
              <span />
            </div>
            <div className="clapperBody">
              <span>SCENE</span>
              <strong>{projects.length.toString().padStart(2, "0")}</strong>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        {!loadingProjects && projects.length > 0 && (
          <div className="statsBar">
            {[
              ["Total Projects", projects.length],
              ["Active", projects.filter(p => p.status === "active").length],
              ["Complete", projects.filter(p => p.status === "completed").length],
              ["Total Pages", projects.reduce((acc, p) => acc + (p.chunks[p.chunks.length - 1]?.pageEnd || 0), 0)],
            ].map(([label, val]) => (
              <div key={label as string} className="statCard">
                <div className="statValue">{val}</div>
                <div className="statLabel">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Projects heading */}
        <div className="projectsHeading">
          <div>
            {loadingProjects ? "Loading..." : `${projects.length} Project${projects.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Loading */}
        {loadingProjects && (
          <div className="loadingState">
            <div style={{ textAlign: "center" }}>
              <div className="spinner" />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div className="loadingText">Loading projects...</div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loadingProjects && projects.length === 0 && (
          <div className="emptyState">
            <div className="emptyFilmIcon" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="emptyTitle">
              No projects yet
            </div>
            <div className="emptyCopy">
              Create your first screenplay project and let the studio start building the next scene.
            </div>
            <button
              onClick={() => setView("new")}
              className="emptyButton"
            >+ Create First Project</button>
          </div>
        )}

        {/* Project grid */}
        {!loadingProjects && projects.length > 0 && (
          <div className="projectGrid">
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
      <div className="footer">
        ScreenMaster · AI Screenplay Studio
      </div>

      <style>{`
        .dashboardShell {
          min-height: 100vh;
          background:
            linear-gradient(180deg, #111 0%, #1c1c1e 42%, #161618 100%);
          color: #f5f5f0;
          font-family: 'Courier Prime','Courier New',monospace;
        }

        .dashboardShell:before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.08;
          background-image:
            linear-gradient(rgba(232,200,74,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,200,74,0.1) 1px, transparent 1px);
          background-size: 92px 92px;
        }

        .topBar {
          background: rgba(17,17,17,0.96);
          border-bottom: 1px solid rgba(232,200,74,0.18);
          padding: 0 28px;
          min-height: 82px;
          display: flex;
          align-items: center;
          gap: 14px;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 18px 44px rgba(0,0,0,0.32);
        }

        .topBar:after {
          content: "";
          position: absolute;
          left: 28px;
          right: 28px;
          bottom: 0;
          height: 2px;
          background: #e8c84a;
          opacity: 0.7;
          box-shadow: 0 0 18px rgba(232,200,74,0.32);
        }

        .brandBlock {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .brandMark {
          width: 38px;
          height: 24px;
          border: 1px solid #e8c84a;
          border-radius: 3px;
          flex: 0 0 auto;
          box-shadow: inset 0 0 0 4px #111, 0 0 22px rgba(232,200,74,0.16);
          background:
            linear-gradient(90deg, transparent 0 18%, #e8c84a 18% 23%, transparent 23% 39%, #e8c84a 39% 44%, transparent 44% 60%, #e8c84a 60% 65%, transparent 65%);
        }

        .brandName {
          color: #f5f5f0;
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .brandSub {
          color: rgba(245,245,240,0.38);
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-top: 3px;
        }

        .primaryButton,
        .emptyButton {
          background: #e8c84a;
          color: #111;
          border: 1px solid #e8c84a;
          border-radius: 4px;
          padding: 12px 18px;
          font-family: 'Courier Prime','Courier New',monospace;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 0 24px rgba(232,200,74,0.18);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          white-space: nowrap;
        }

        .primaryButton:hover,
        .emptyButton:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 38px rgba(232,200,74,0.3);
        }

        .dashboardBody {
          position: relative;
          padding: 34px 24px 24px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .dashboardHeader {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .kicker,
        .projectsHeading div {
          color: #e8c84a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .dashboardHeader h1 {
          color: #f5f5f0;
          font-size: clamp(34px, 7vw, 76px);
          line-height: 0.94;
          letter-spacing: 0;
          text-transform: uppercase;
          margin: 10px 0 12px;
        }

        .dashboardHeader p {
          color: rgba(245,245,240,0.55);
          font-size: 13px;
          line-height: 1.6;
          margin: 0;
          max-width: 620px;
        }

        .clapper {
          width: 170px;
          min-height: 132px;
          border: 1px solid rgba(232,200,74,0.34);
          border-radius: 5px;
          background: #161618;
          box-shadow: 0 0 34px rgba(232,200,74,0.08);
          overflow: hidden;
          flex: 0 0 auto;
        }

        .clapperTop {
          height: 38px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 7px;
          border-bottom: 1px solid rgba(232,200,74,0.28);
          background: #111;
        }

        .clapperTop span {
          background: repeating-linear-gradient(135deg, #e8c84a 0 8px, #111 8px 16px);
          opacity: 0.86;
        }

        .clapperBody {
          height: calc(100% - 38px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 18px;
        }

        .clapperBody span {
          color: rgba(245,245,240,0.42);
          font-size: 9px;
          letter-spacing: 0.2em;
        }

        .clapperBody strong {
          color: #e8c84a;
          font-size: 34px;
          line-height: 1;
          margin-top: 8px;
        }

        .statsBar {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }

        .statCard {
          background: #161618;
          border: 1px solid rgba(232,200,74,0.14);
          border-left: 3px solid #e8c84a;
          border-radius: 6px;
          padding: 16px 18px;
          min-width: 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .statCard:hover {
          transform: translateY(-3px);
          border-color: rgba(232,200,74,0.36);
          box-shadow: 0 0 32px rgba(232,200,74,0.1), 0 16px 34px rgba(0,0,0,0.24);
        }

        .statValue {
          color: #e8c84a;
          font-size: 24px;
          font-weight: bold;
        }

        .statLabel {
          color: rgba(245,245,240,0.42);
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .projectsHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          border-top: 1px solid rgba(232,200,74,0.12);
          padding-top: 18px;
        }

        .loadingState {
          display: flex;
          justify-content: center;
          padding: 72px 0;
          color: rgba(245,245,240,0.44);
        }

        .spinner {
          width: 38px;
          height: 38px;
          border: 2px solid rgba(232,200,74,0.18);
          border-top: 2px solid #e8c84a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 14px;
          box-shadow: 0 0 22px rgba(232,200,74,0.14);
        }

        .loadingText {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .emptyState {
          text-align: center;
          padding: 76px 28px;
          background:
            linear-gradient(180deg, rgba(232,200,74,0.04), rgba(22,22,24,0)),
            #161618;
          border: 1px dashed rgba(232,200,74,0.32);
          border-radius: 8px;
          box-shadow: inset 0 0 80px rgba(0,0,0,0.22);
        }

        .emptyFilmIcon {
          width: 104px;
          height: 72px;
          border: 2px solid #e8c84a;
          border-radius: 5px;
          margin: 0 auto 22px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 10px;
          box-shadow: 0 0 34px rgba(232,200,74,0.2);
        }

        .emptyFilmIcon span {
          border: 1px solid rgba(232,200,74,0.7);
          background: #111;
        }

        .emptyTitle {
          color: #f5f5f0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .emptyCopy {
          color: rgba(245,245,240,0.48);
          font-size: 12px;
          line-height: 1.7;
          max-width: 520px;
          margin: 0 auto 28px;
        }

        .emptyButton {
          padding: 14px 24px;
        }

        .projectGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .footer {
          padding: 38px 20px;
          text-align: center;
          color: rgba(245,245,240,0.28);
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        @media (max-width: 760px) {
          .topBar {
            min-height: 74px;
            padding: 0 16px;
          }

          .topBar:after {
            left: 16px;
            right: 16px;
          }

          .brandName {
            font-size: 13px;
          }

          .brandSub {
            display: none;
          }

          .primaryButton {
            padding: 10px 12px;
            font-size: 10px;
          }

          .dashboardBody {
            padding: 28px 14px 20px;
          }

          .dashboardHeader {
            flex-direction: column;
          }

          .clapper {
            width: 100%;
            min-height: 118px;
          }

          .statsBar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .projectGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
