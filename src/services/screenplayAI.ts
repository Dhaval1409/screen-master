// src/services/screenplayAI.ts
// Core AI service — all Gemini calls go through here

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectContext {
  title: string;
  genre: string;
  storyType: string;
  targetPages: number;
  description: string;
  characters?: Array<{
    name: string;
    age?: number;
    role: string;
    description: string;
  }>;
}

export interface ChunkContext {
  chunkNumber: number;
  pageStart: number;
  previousChunks: Array<{
    chunkNumber: number;
    summary: string;
    pageEnd: number;
  }>;
  // The last chunk's actual content (for direct continuity)
  lastChunkContent?: string;
}

export interface GeneratedChunk {
  content: string;      // The screenplay text
  summary: string;      // 1-line summary of what happened
  sceneCount: number;   // Number of scenes in this chunk
  pageStart: number;
  pageEnd: number;
}

// ─── Model factory ────────────────────────────────────────────────────────────

function getModel(temperature = 0.82) {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    apiKey: process.env.GOOGLE_API_KEY!,
    temperature,
    maxOutputTokens: 1800, // ~2 pages per chunk, safe for free tier
  });
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err.message?.includes("429") || err.message?.includes("quota");
      if (is429 && i < retries) {
        await new Promise(res => setTimeout(res, 20000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SCREENPLAY_RULES = `
You are an Oscar-level professional screenplay writer continuing an ongoing script.

STRICT FORMAT RULES:
- Scene heading: INT./EXT./I/E. LOCATION — DAY/NIGHT/CONTINUOUS (always CAPS)
- Action lines: present tense, only what camera sees/hears, max 3-4 lines per block
- Emotions only through visible behavior — never internal thoughts
- Character intro: NAME (age) in CAPS first time only
- Dialogue: character name centered above in CAPS, text below
- CONT'D when same character speaks after action interruption
- V.O. for voiceover, O.S. for off-screen voice
- Parentheticals (in brackets) — use sparingly for tone/direction
- Transitions flush right: CUT TO: / DISSOLVE TO: / SMASH CUT TO: / FADE TO BLACK.
- Dialogue in natural Hinglish (Hindi + English) unless genre requires otherwise
- 1 page = ~55 lines. Write exactly 2 pages per chunk (~110 lines of content)
- Do NOT summarize or wrap up — just write the next 2 pages as if mid-script
- Do NOT add "END OF CHUNK" or any markers — pure screenplay only
`;

// ─── Generate first chunk ─────────────────────────────────────────────────────

export async function generateFirstChunk(
  project: ProjectContext
): Promise<GeneratedChunk> {
  const model = getModel();

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SCREENPLAY_RULES],
    [
      "human",
      `You are starting a NEW screenplay project. Write the OPENING 2 pages only.

PROJECT:
Title: {title}
Genre: {genre}
Type: {storyType}
Total length: {targetPages} pages
Premise: {description}

START from page 1. Write the opening scene — establish world, introduce protagonist, hook the audience.
Begin directly with the first scene heading. No preamble.`,
    ],
  ]);

  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  const content = await withRetry(() =>
    chain.invoke({
      title: project.title,
      genre: project.genre,
      storyType: project.storyType,
      targetPages: project.targetPages.toString(),
      description: project.description,
    })
  );

  const summary = await generateChunkSummary(content, 1);
  const sceneCount = countScenes(content);

  return {
    content: content.trim(),
    summary,
    sceneCount,
    pageStart: 1,
    pageEnd: 2,
  };
}

// ─── Generate next chunk ──────────────────────────────────────────────────────

export async function generateNextChunk(
  project: ProjectContext,
  chunk: ChunkContext
): Promise<GeneratedChunk> {
  const model = getModel();

  // Build a condensed story-so-far from summaries
  const storySoFar = chunk.previousChunks
    .map(c => `Pages ${c.pageEnd - 1}-${c.pageEnd}: ${c.summary}`)
    .join("\n");

  // Calculate story position for structural guidance
  const progress = chunk.pageStart / project.targetPages;
  const structureHint = getStructureHint(progress, project.targetPages);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SCREENPLAY_RULES],
    [
      "human",
      `You are CONTINUING an existing screenplay. Write the NEXT 2 pages only.

PROJECT:
Title: {title}
Genre: {genre}  
Premise: {description}
Total length: {targetPages} pages
Current position: page {pageStart} of {targetPages} ({progressPct}% through)
Story structure note: {structureHint}

STORY SO FAR (summaries):
{storySoFar}

LAST WRITTEN (continue DIRECTLY from here):
{lastContent}

---
Continue the story from exactly where it left off. Write pages {pageStart}-{pageEnd} only.
Maintain all character voices, ongoing tension, and story momentum.
Do NOT recap. Do NOT start a new story. Continue seamlessly.`,
    ],
  ]);

  const chain = prompt.pipe(model).pipe(new StringOutputParser());

  const content = await withRetry(() =>
    chain.invoke({
      title: project.title,
      genre: project.genre,
      description: project.description,
      targetPages: project.targetPages.toString(),
      pageStart: chunk.pageStart.toString(),
      pageEnd: (chunk.pageStart + 1).toString(),
      progressPct: Math.round(progress * 100).toString(),
      structureHint,
      storySoFar: storySoFar || "This is the beginning of the story.",
      lastContent: chunk.lastChunkContent?.slice(-1500) || "", // last 1500 chars for continuity
    })
  );

  const summary = await generateChunkSummary(content, chunk.chunkNumber);
  const sceneCount = countScenes(content);

  return {
    content: content.trim(),
    summary,
    sceneCount,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageStart + 1,
  };
}

// ─── Generate chunk summary (for context window management) ──────────────────

async function generateChunkSummary(content: string, chunkNum: number): Promise<string> {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    apiKey: process.env.GOOGLE_API_KEY!,
    temperature: 0.1,
    maxOutputTokens: 120,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Summarize this screenplay excerpt in ONE sentence (max 25 words). Focus on: what happened, what changed, where the story is now. Be specific."],
    ["human", "{content}"],
  ]);

  try {
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const summary = await chain.invoke({ content: content.slice(0, 2000) });
    return summary.trim();
  } catch {
    // Fallback — extract first scene heading as summary
    const match = content.match(/^(INT\.|EXT\.|I\/E\.).+$/m);
    return match ? `Scene: ${match[0]}` : `Chunk ${chunkNum} generated.`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countScenes(content: string): number {
  return (content.match(/^(INT\.|EXT\.|I\/E\.)/gm) || []).length;
}

function getStructureHint(progress: number, totalPages: number): string {
  if (progress < 0.12) return "Act 1 Setup — establish world, characters, normal life";
  if (progress < 0.18) return "Act 1 Inciting Incident — something disrupts the normal world";
  if (progress < 0.28) return "Act 1 Turn — protagonist commits to the journey";
  if (progress < 0.45) return "Act 2 Rising Action — obstacles, complications, character pressure";
  if (progress < 0.55) return "Act 2 Midpoint — major revelation or reversal, stakes double";
  if (progress < 0.72) return "Act 2 Crisis — things fall apart, protagonist at lowest point";
  if (progress < 0.82) return "Act 2 Turn — protagonist finds new resolve, final push begins";
  if (progress < 0.92) return "Act 3 Climax — final confrontation, everything on the line";
  return "Act 3 Resolution — aftermath, new equilibrium, closing image";
}

// ─── Extract characters from first chunk ─────────────────────────────────────

export async function extractCharacters(content: string): Promise<ProjectContext["characters"]> {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    apiKey: process.env.GOOGLE_API_KEY!,
    temperature: 0.1,
    maxOutputTokens: 600,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `Extract characters from this screenplay. Return ONLY valid JSON array, no markdown:
[{"name":"CHARACTER NAME","age":25,"role":"protagonist","description":"one line"}]
Role options: protagonist, antagonist, supporting, love_interest, mentor`],
    ["human", "{content}"],
  ]);

  try {
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const raw = await chain.invoke({ content: content.slice(0, 3000) });
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}