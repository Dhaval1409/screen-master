// src/app/api/projects/[id]/export/route.ts
// GET — export the full assembled screenplay as plain text or FDX

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "txt"; // "txt" | "fdx"

    const project = await prisma.project.findUnique({
      where: {id: id},
      include: {
        chunks: { orderBy: { chunkNumber: "asc" } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Assemble all chunks into one screenplay
    const fullScreenplay = project.chunks
      .map(c => c.content)
      .join("\n\n");

    const slug = project.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    if (format === "fdx") {
      const fdx = buildFDX(fullScreenplay, project.title);
      return new NextResponse(fdx, {
        headers: {
          "Content-Type": "text/xml;charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}.fdx"`,
        },
      });
    }

    // Default: properly formatted TXT
    const txt = buildTXT(fullScreenplay, project.title);
    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.txt"`,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Format helpers ────────────────────────────────────────────────────────────

function buildTXT(screenplay: string, title: string): string {
  const header = [
    " ".repeat(30) + title.toUpperCase(),
    " ".repeat(30) + "Written with ScreenMaster AI",
    "",
    "",
  ].join("\n");

  const body = screenplay.split("\n").map(line => {
    const t = line.trim();
    if (!t) return "";
    if (/^(INT\.|EXT\.|I\/E\.)/.test(t)) return t;
    if (/^(CUT TO:|SMASH CUT TO:|JUMP CUT TO:|DISSOLVE TO:|INTERCUT WITH:|FADE TO BLACK\.|FADE OUT\.|MATCH CUT TO:)$/i.test(t))
      return " ".repeat(Math.max(0, 60 - t.length)) + t;
    if (/^\(.*\)$/.test(t)) return " ".repeat(25) + t;
    if (t === t.toUpperCase() && t.length > 1 && /^[A-Z\s'().\/,0-9-]+$/.test(t))
      return " ".repeat(37) + t;
    return t;
  }).join("\n");

  return header + body;
}

function buildFDX(screenplay: string, title: string): string {
  const lines = screenplay.split("\n");
  let paragraphs = "";
  const prevTypes: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let type = "Action";
    if (/^(INT\.|EXT\.|I\/E\.)/.test(t)) type = "Scene Heading";
    else if (/^(CUT TO:|DISSOLVE TO:|FADE TO BLACK\.|FADE OUT\.)$/i.test(t)) type = "Transition";
    else if (/^\(.*\)$/.test(t)) type = "Parenthetical";
    else if (t === t.toUpperCase() && t.length > 1 && /^[A-Z\s'().\/,0-9-]+$/.test(t)) type = "Character";
    else {
      const prev = prevTypes[prevTypes.length - 1];
      if (prev === "Character" || prev === "Parenthetical" || prev === "Dialogue") type = "Dialogue";
    }
    prevTypes.push(type);
    const text = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    paragraphs += `    <Paragraph Type="${type}"><Text>${text}</Text></Paragraph>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="2">
  <TitlePage>
    <Content>
      <Paragraph><Text>${title}</Text></Paragraph>
      <Paragraph><Text>Written with ScreenMaster AI</Text></Paragraph>
    </Content>
  </TitlePage>
  <Content>
${paragraphs}  </Content>
</FinalDraft>`;
}