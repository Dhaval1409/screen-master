import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextChunk } from "@/services/screenplayAI";

export const runtime = "nodejs";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        chunks: { orderBy: { chunkNumber: "asc" } },
      },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (project.status === "completed") return NextResponse.json({ error: "Project is already completed" }, { status: 400 });

    const chunks = project.chunks;
    const lastChunk = chunks[chunks.length - 1];
    if (!lastChunk) return NextResponse.json({ error: "No chunks found. Generate the first chunk first." }, { status: 400 });

    const currentPage = lastChunk.pageEnd;
    if (currentPage >= project.targetPages) {
      await prisma.project.update({ where: { id: project.id }, data: { status: "completed" } });
      return NextResponse.json({ error: "Screenplay is complete!", completed: true, totalPages: currentPage }, { status: 400 });
    }

    const previousChunkSummaries = chunks.map(c => ({
      chunkNumber: c.chunkNumber,
      summary: c.summary,
      pageEnd: c.pageEnd,
    }));

    const nextPageStart = lastChunk.pageEnd + 1;
    const generated = await generateNextChunk(
      {
        title: project.title,
        genre: project.genre,
        storyType: project.storyType,
        targetPages: project.targetPages,
        description: project.description,
        characters: (project.characters as any) || [],
      },
      {
        chunkNumber: lastChunk.chunkNumber + 1,
        pageStart: nextPageStart,
        previousChunks: previousChunkSummaries,
        lastChunkContent: lastChunk.content,
      }
    );

    const newChunk = await prisma.screenplayChunk.create({
      data: {
        projectId: project.id,
        content: generated.content,
        chunkNumber: lastChunk.chunkNumber + 1,
        pageStart: generated.pageStart,
        pageEnd: generated.pageEnd,
        summary: generated.summary,
        sceneCount: generated.sceneCount,
      },
    });

    await prisma.project.update({ where: { id: project.id }, data: { updatedAt: new Date() } });

    const isComplete = newChunk.pageEnd >= project.targetPages;
    if (isComplete) {
      await prisma.project.update({ where: { id: project.id }, data: { status: "completed" } });
    }

    return NextResponse.json({
      chunk: newChunk,
      currentPage: newChunk.pageEnd,
      targetPages: project.targetPages,
      progressPercent: Math.round((newChunk.pageEnd / project.targetPages) * 100),
      isComplete,
    });

  } catch (err: any) {
    console.error("Continue story error:", err);
    const msg = err.message || "";
    if (msg.includes("429") || msg.includes("quota")) {
      return NextResponse.json({ error: "AI rate limit. Wait a moment and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: msg || "Failed to generate next chunk" }, { status: 500 });
  }
}