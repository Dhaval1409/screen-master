import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

const REWRITE_SYSTEM_PROMPT = `
You are an Oscar-level screenplay doctor. A writer gives you a scene and tells you HOW to rewrite it.

Your job: rewrite the scene in proper professional screenplay format, applying the requested change with surgical precision.

STRICT SCREENPLAY FORMAT RULES:
- Scene heading in CAPS: INT./EXT./I/E. LOCATION — DAY/NIGHT/CONTINUOUS
- Action lines in present tense. Only what camera can SEE or HEAR.
- Emotions shown through physical behavior only. No internal thoughts.
- First appearance: CHARACTER NAME (age) in CAPS.
- Dialogue centered under character name in CAPS.
- CONT'D when same character speaks after action line interruption.
- V.O. for voiceover. O.S. for off-screen voice.
- Parentheticals in (brackets) — use sparingly.
- Transitions flush right: CUT TO: / DISSOLVE TO: / SMASH CUT TO:
- Dialogue in natural Hinglish (Hindi + English mix) unless original is different.
- Max 3-4 lines per action block.

REWRITE MODES — apply exactly what's asked:
- "more tense" → shorter sentences, more white space, interrupted dialogue, physical dread
- "more subtext" → characters say opposite of what they mean, pauses, looks away, unfinished sentences
- "funnier" → timing beats, physical comedy, ironic reversals, comic parentheticals
- "more emotional" → earned vulnerability, silence, physical tenderness, restraint over melodrama
- "faster pacing" → cut all unnecessary action lines, punch up dialogue, more cuts
- "slower / more cinematic" → expand action lines, visual details, let moments breathe
- "more conflict" → raise stakes in every exchange, characters push harder
- "oscar worthy" → all of the above combined — subtext, visual precision, emotional truth

After your rewrite, add a short note (2-3 lines) explaining the key changes you made.

Format:
===REWRITE===
[rewritten scene]

===NOTES===
[what you changed and why]
`;

async function callWithRetry(chain: any, input: any, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await chain.invoke(input);
    } catch (error: any) {
      const is429 = error.message?.includes("429") || error.message?.includes("quota");
      if (is429 && i < retries) {
        await new Promise((res) => setTimeout(res, 20000));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached");
}

export async function POST(req: NextRequest) {
  try {
    const { scene, instruction } = await req.json();

    if (!scene || !instruction) {
      return NextResponse.json({ error: "scene and instruction are required" }, { status: 400 });
    }

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.85,
      maxOutputTokens: 2000,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", REWRITE_SYSTEM_PROMPT],
      [
        "human",
        `Rewrite this scene. Instruction: {instruction}

ORIGINAL SCENE:
{scene}

Apply the instruction and return the rewritten scene with your notes.`,
      ],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const raw = await callWithRetry(chain, { scene, instruction });

    const rewriteSplit = raw.split("===REWRITE===");
    const notesSplit = raw.split("===NOTES===");

    const rewrite = rewriteSplit.length > 1
      ? rewriteSplit[1].split("===NOTES===")[0].trim()
      : raw.trim();

    const notes = notesSplit.length > 1 ? notesSplit[1].trim() : "";

    return NextResponse.json({ rewrite, notes });
  } catch (error: any) {
    console.error("Rewrite API error:", error);
    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("quota")) {
      return NextResponse.json({ error: "Rate limit reached. Wait a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: msg || "Something went wrong" }, { status: 500 });
  }
}