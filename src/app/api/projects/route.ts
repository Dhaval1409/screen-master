// src/app/api/projects/route.ts
// GET all projects, POST create new project

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFirstChunk, extractCharacters } from "@/services/screenplayAI";

export const runtime = "nodejs";

// GET /api/projects — list all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        chunks: {
          select: {
            id: true,
            chunkNumber: true,
            pageEnd: true,
            summary: true,
            createdAt: true,
          },
          orderBy: { chunkNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/projects — create project + generate first chunk
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, genre, storyType, targetPages, description } = body;

    if (!title || !genre || !storyType || !targetPages || !description) {
      return NextResponse.json(
        { error: "All fields required: title, genre, storyType, targetPages, description" },
        { status: 400 }
      );
    }

    // 1. Create the project in DB
    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        genre,
        storyType,
        targetPages: Number(targetPages),
        description: description.trim(),
        status: "active",
      },
    });

    // 2. Generate first chunk via AI
    const generated = await generateFirstChunk({
      title: project.title,
      genre: project.genre,
      storyType: project.storyType,
      targetPages: project.targetPages,
      description: project.description,
    });

    // 3. Save first chunk
    const chunk = await prisma.screenplayChunk.create({
      data: {
        projectId: project.id,
        content: generated.content,
        chunkNumber: 1,
        pageStart: generated.pageStart,
        pageEnd: generated.pageEnd,
        summary: generated.summary,
        sceneCount: generated.sceneCount,
      },
    });

    // 4. Extract + save characters in background (don't await — non-blocking)
    extractCharacters(generated.content).then(async (chars) => {
      if (chars && chars.length > 0) {
        await prisma.project.update({
          where: { id: project.id },
          data: { characters: chars as any },
        });
      }
    }).catch(() => {}); // silent fail — characters are bonus data

    return NextResponse.json({
      project,
      chunk,
    }, { status: 201 });

  } catch (err: any) {
    console.error("Create project error:", err);
    const msg = err.message || "";
    if (msg.includes("429") || msg.includes("quota")) {
      return NextResponse.json({ error: "AI rate limit. Wait a moment and try again." }, { status: 429 });
    }
    return NextResponse.json({ error: msg || "Failed to create project" }, { status: 500 });
  }
}