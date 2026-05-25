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
    age?: number | string;
    role?: string;
    description: string;
    goal?: string;
    flaw?: string;
    voice?: string;
    arc?: string;
  }>;
  sceneOutline?: Array<{
    title: string;
    description: string;
    status?: string;
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

═══ CINEMATIC RHYTHM — MOST IMPORTANT RULE ═══
Action blocks must BREATHE. Short. Punchy. Visual.
Never write dense paragraphs. Every 1-2 sentences = new line break.

WRONG ❌
The alley is narrow, the walls slick with grime. Overflowing garbage bins line one side, the stench hanging heavy as Anjali moves carefully through the darkness, her flashlight cutting weak arcs through the fog.

CORRECT ✅
The alley is narrow.

Walls slick with grime.

Overflowing bins. The stench hangs heavy.

Anjali's flashlight cuts weak arcs through the fog.

═══ ACTION LINE RULES ═══
- MAX 2 sentences per action block, then a blank line
- Only what the CAMERA CAN SEE or HEAR — never internal thoughts
- Present tense always
- Short declarative sentences. No flourish. No metaphor.
- Character intro: NAME (age) in CAPS first appearance only
- Show emotion through BEHAVIOR, not description
  WRONG ❌: She feels scared.
  CORRECT ✅: Her hand trembles on the door handle.

═══ PARENTHETICALS ═══
- Keep them tiny — one or two words only
  WRONG ❌: (To herself, in a low whisper, nervously)
  CORRECT ✅: (whispering) or (to herself)
- Use SPARINGLY — only when delivery is truly non-obvious
- Never use for physical action — that belongs in action lines

═══ DIALOGUE ═══
- Natural spoken rhythm — how people actually talk
- Hinglish where natural (Hindi + English mix)
- No on-the-nose dialogue — subtext over text
- V.O. for voiceover, O.S. for off-screen

═══ SCENE HEADINGS ═══
- INT./EXT./I/E. LOCATION — DAY/NIGHT/CONTINUOUS
- Always full CAPS
- CONTINUOUS when scene flows directly from previous

═══ TRANSITIONS ═══
- Flush right: CUT TO: / DISSOLVE TO: / SMASH CUT TO: / FADE TO BLACK.
- Use sparingly — only for meaningful time/tone jumps
- Most scene cuts need NO transition

═══ PAGE COUNT ═══
- 1 page = ~55 lines
- Write exactly 2 pages per chunk (~110 lines)
- Do NOT summarize or wrap up the chunk
- Do NOT add any markers like "END OF CHUNK"
- Pure screenplay text only

═══ CINEMATIC RHYTHM EXAMPLES ═══

WRONG — novelistic ❌
The taxi screeches to a halt outside a narrow alleyway, the city a dizzying kaleidoscope of lights and shadows behind it as Anjali steps out into the wet street.

CORRECT — cinematic ✅
The taxi BRAKES hard.

Anjali jolts forward.

Outside —

A narrow alley.

Dark. Wet. Silent.

---

WRONG — information dump ❌
She's looking for a specific building number as she moves through the alley.

CORRECT — visual action ✅
Her flashlight jumps from one rusted number plate to the next.

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
      `You are starting a NEW screenplay. Write the OPENING 2 pages only.

PROJECT:
Title: {title}
Genre: {genre}
Type: {storyType}
Total length: {targetPages} pages
Premise: {description}

RHYTHM REMINDER:
- Max 2 sentences per action block, then blank line
- Short. Visual. Breathing.
- No dense paragraphs — ever
- Parentheticals: (whispering) not (To herself, in a low whisper)

START from page 1. Establish world, introduce protagonist, hook the audience.
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
  const characterBible = formatCharacters(project.characters);
  const sceneOutline = formatSceneOutline(project.sceneOutline);

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

CHARACTER BIBLE:
{characterBible}

SCENE OUTLINE / BEAT BOARD:
{sceneOutline}

STORY SO FAR (summaries):
{storySoFar}

LAST WRITTEN (continue DIRECTLY from here):
{lastContent}

RHYTHM REMINDER:
- Max 2 sentences per action block, then blank line
- Short. Visual. Breathing.
- No dense paragraphs — ever
- Parentheticals: (whispering) not (To herself, in a low whisper)

---
Continue from exactly where it left off. Pages {pageStart}-{pageEnd} only.
Maintain character voices, tension, momentum.
Do NOT recap. Do NOT start new story. Continue seamlessly.`,
      
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
      characterBible,
      sceneOutline,
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

function formatCharacters(characters: ProjectContext["characters"]): string {
  if (!characters || characters.length === 0) {
    return "No saved character bible yet. Maintain continuity from the written screenplay.";
  }

  return characters
    .map((char, index) => [
      `${index + 1}. ${char.name}`,
      char.role ? `Role: ${char.role}` : "",
      char.age ? `Age: ${char.age}` : "",
      char.goal ? `Goal: ${char.goal}` : "",
      char.flaw ? `Flaw: ${char.flaw}` : "",
      char.voice ? `Voice: ${char.voice}` : "",
      char.arc ? `Arc: ${char.arc}` : "",
      `Description: ${char.description}`,
    ].filter(Boolean).join(" | "))
    .join("\n");
}

function formatSceneOutline(sceneOutline: ProjectContext["sceneOutline"]): string {
  if (!sceneOutline || sceneOutline.length === 0) {
    return "No saved scene outline yet. Follow the structural note and story so far.";
  }

  return sceneOutline
    .map((scene, index) => `${index + 1}. ${scene.title} (${scene.status || "planned"}): ${scene.description}`)
    .join("\n");
}
