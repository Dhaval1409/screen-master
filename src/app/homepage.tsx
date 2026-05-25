import Link from "next/link";

const featureCards = [
  {
    title: "AI Generation",
    description: "Turn fragments, scenes, and concepts into structured screenplay pages with studio-speed drafting.",
  },
  {
    title: "Script Formatting",
    description: "Keep dialogue, action, and scene direction locked into a clean screenplay rhythm.",
  },
  {
    title: "Project Management",
    description: "Track every screenplay, draft, genre, and page count from a single production dashboard.",
  },
];

export default function Homepage() {
  return (
    <main className="screenmaster-home">
      <section className="hero">
        <div className="grain" />
        <div className="grid" />
        <div className="spotlight" />

        <nav className="nav" aria-label="Primary navigation">
          <div className="brand">
            <span className="mark" aria-hidden="true" />
            <span>ScreenMaster</span>
          </div>
          <Link className="navLink" href="/dashboard">
            Dashboard
          </Link>
        </nav>

        <div className="heroContent">
          <p className="eyebrow">AI Screenplay Studio</p>
          <h1>LIGHTS. CAMERA. WRITE.</h1>
          <p className="tagline">
            AI-powered screenplay writing studio for building polished scripts, scenes, and story worlds.
          </p>
          <Link className="cta" href="/dashboard">
            Start Writing
          </Link>
        </div>

        <div className="filmStrip" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </section>

      <section className="features" aria-label="ScreenMaster features">
        <div className="sectionHeader">
          <p>Production Tools</p>
          <h2>Built for the blank page and the final draft.</h2>
        </div>
        <div className="featureGrid">
          {featureCards.map((feature) => (
            <article className="featureCard" key={feature.title}>
              <div className="featureLine" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>ScreenMaster · AI Screenplay Studio</footer>

      <style>{`
        .screenmaster-home {
          min-height: 100vh;
          background: #111;
          color: #f5f5f0;
          font-family: 'Courier Prime', 'Courier New', monospace;
          overflow-x: hidden;
        }

        .hero {
          min-height: 78vh;
          position: relative;
          display: flex;
          flex-direction: column;
          isolation: isolate;
          background:
            linear-gradient(180deg, rgba(17,17,17,0.15), #111 94%),
            radial-gradient(circle at 50% 0%, rgba(232,200,74,0.16), rgba(28,28,30,0.18) 36%, rgba(17,17,17,0) 62%),
            #1c1c1e;
        }

        .grain,
        .grid,
        .spotlight {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: -1;
        }

        .grain {
          opacity: 0.18;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(245,245,240,0.16) 0 1px, transparent 1px),
            radial-gradient(circle at 70% 60%, rgba(245,245,240,0.1) 0 1px, transparent 1px);
          background-size: 17px 17px, 23px 23px;
        }

        .grid {
          opacity: 0.18;
          background-image:
            linear-gradient(rgba(232,200,74,0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,200,74,0.1) 1px, transparent 1px);
          background-size: 76px 76px;
          mask-image: linear-gradient(to bottom, black 0%, transparent 82%);
        }

        .spotlight {
          background:
            radial-gradient(ellipse at 50% 16%, rgba(232,200,74,0.2), rgba(232,200,74,0.04) 34%, transparent 68%);
        }

        .nav {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(232,200,74,0.24);
        }

        .brand,
        .navLink {
          color: #f5f5f0;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .mark {
          width: 32px;
          height: 20px;
          border: 1px solid #e8c84a;
          border-radius: 2px;
          box-shadow: inset 0 0 0 3px #111, 0 0 18px rgba(232,200,74,0.16);
          background:
            linear-gradient(90deg, transparent 0 18%, #e8c84a 18% 22%, transparent 22% 40%, #e8c84a 40% 44%, transparent 44% 62%, #e8c84a 62% 66%, transparent 66%);
        }

        .navLink {
          color: #e8c84a;
          padding: 12px 0;
        }

        .heroContent {
          width: min(1180px, calc(100% - 40px));
          margin: auto;
          padding: 90px 0 120px;
        }

        .eyebrow {
          color: #e8c84a;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          margin: 0 0 18px;
        }

        h1 {
          max-width: 980px;
          color: #f5f5f0;
          font-size: clamp(48px, 9vw, 124px);
          line-height: 0.9;
          letter-spacing: 0;
          margin: 0;
          text-transform: uppercase;
        }

        .tagline {
          max-width: 680px;
          color: rgba(245,245,240,0.72);
          font-size: clamp(16px, 2vw, 21px);
          line-height: 1.55;
          margin: 28px 0 34px;
        }

        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 56px;
          padding: 0 30px;
          border: 1px solid #e8c84a;
          border-radius: 4px;
          background: #e8c84a;
          color: #111;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-decoration: none;
          box-shadow: 0 0 30px rgba(232,200,74,0.22);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 44px rgba(232,200,74,0.34);
        }

        .filmStrip {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 26px;
          display: flex;
          gap: 12px;
          justify-content: center;
          opacity: 0.28;
        }

        .filmStrip span {
          width: 42px;
          height: 16px;
          border: 1px solid #e8c84a;
          background: #111;
        }

        .features {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 56px 0 76px;
        }

        .sectionHeader {
          max-width: 760px;
          margin-bottom: 28px;
        }

        .sectionHeader p {
          color: #e8c84a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          margin: 0 0 12px;
        }

        .sectionHeader h2 {
          color: #f5f5f0;
          font-size: clamp(28px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: 0;
          margin: 0;
        }

        .featureGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .featureCard {
          position: relative;
          min-height: 210px;
          background: #161618;
          border: 1px solid rgba(232,200,74,0.2);
          border-radius: 6px;
          padding: 24px;
          overflow: hidden;
        }

        .featureCard:before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(232,200,74,0.08) 1px, transparent 1px);
          background-size: 100% 28px;
          opacity: 0.18;
          pointer-events: none;
        }

        .featureLine {
          width: 54px;
          height: 3px;
          background: #e8c84a;
          margin-bottom: 34px;
          box-shadow: 0 0 18px rgba(232,200,74,0.3);
        }

        .featureCard h3 {
          color: #f5f5f0;
          font-size: 18px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0 0 12px;
        }

        .featureCard p {
          color: rgba(245,245,240,0.62);
          font-size: 13px;
          line-height: 1.7;
          margin: 0;
        }

        footer {
          border-top: 1px solid rgba(232,200,74,0.14);
          color: rgba(245,245,240,0.38);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-align: center;
          text-transform: uppercase;
          padding: 28px 20px;
          background: #111;
        }

        @media (max-width: 780px) {
          .nav {
            width: min(100% - 28px, 1180px);
            min-height: 68px;
          }

          .brand,
          .navLink {
            font-size: 11px;
          }

          .heroContent,
          .features {
            width: min(100% - 28px, 1180px);
          }

          .heroContent {
            padding: 72px 0 96px;
          }

          .featureGrid {
            grid-template-columns: 1fr;
          }

          .featureCard {
            min-height: 178px;
          }

          .filmStrip {
            gap: 8px;
            overflow: hidden;
          }

          .filmStrip span {
            width: 30px;
          }
        }
      `}</style>
    </main>
  );
}
