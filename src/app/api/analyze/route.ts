import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

const ANALYSIS_SYSTEM_PROMPT = `
You are a senior Hollywood script analyst and Oscar-level screenplay writer.

Your job is TWO phases:

═══════════════════════════════════════
PHASE 1 — STORY ANALYSIS
═══════════════════════════════════════
Read the raw story/idea the user has provided. Extract and analyse:

1. LOGLINE — One sentence. Who wants what, what stops them, what's at stake.
2. CHARACTERS — For each character: name, age (estimate if not given), role (protagonist/antagonist/supporting), personality in 2 lines, arc (where they start vs where they end).
3. STRUCTURE — Three acts:
   - Act 1: Setup, inciting incident
   - Act 2: Confrontation, midpoint, crisis
   - Act 3: Climax, resolution
4. THEMES — What is this story really about underneath the plot?
5. TONE — Genre + emotional register (dark thriller, dark comedy, etc.)
6. GAPS/WEAKNESSES — What is missing or underdeveloped in the raw story?
7. WHAT MAKES IT UNIQUE — The one thing that makes this story worth telling.

═══════════════════════════════════════
PHASE 2 — SCREENPLAY
═══════════════════════════════════════
Using your analysis, write a professional 3-5 page screenplay from the story.

STRICT SCREENPLAY FORMAT RULES:
- Scene heading in CAPS: INT./EXT./I/E. LOCATION — DAY/NIGHT/CONTINUOUS
- Action lines in present tense. Only what camera can SEE or HEAR. No internal thoughts.
- Show emotions through physical behavior only.
- First appearance: CHARACTER NAME (age) in CAPS. Example: DEEPAK (24) sits nervously.
- Dialogue centered, character name above in CAPS.
- CONT'D when same character speaks after an action line interruption.
- V.O. for voiceover narration. O.S. for off-screen voice in same location.
- Parentheticals (in brackets) for tone/minor action during dialogue. Use sparingly.
- Transitions flush right: CUT TO: / DISSOLVE TO: / SMASH CUT TO: / FADE TO BLACK.
- 1 page = 1 minute of screen time.
- Dialogue must be natural Hinglish (Hindi + English mix) unless story is in another language.
- Never reveal plot or summarize. Unfold moment by moment.
- Max 3-4 lines per action block.

OUTPUT FORMAT — use these exact markers so the frontend can split them:

===ANALYSIS===
[Your full story analysis here]

===SCREENPLAY===
[Your full screenplay here]
`;

async function callWithRetry(chain: any, input: any, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await chain.invoke(input);
    } catch (error: any) {
      const is429 =
        error.message?.includes("429") || error.message?.includes("quota");
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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("rawText") as string | null;

    let storyContent = "";

    // If file uploaded — read it
    if (file) {
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
        // Plain text — read directly
        storyContent = await file.text();
      } else if (fileName.endsWith(".pdf")) {
        // PDF — send as base64 to Gemini (it can read PDFs natively)
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        // For PDF we use a direct Gemini call with inline data
        const model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash-lite",
          apiKey: process.env.GOOGLE_API_KEY!,
          temperature: 0.1,
          maxOutputTokens: 1000,
        });

        // First extract text from PDF using Gemini's vision
        const extractPrompt = ChatPromptTemplate.fromMessages([
          [
            "human",
            [
              {
                type: "media",
                mimeType: "application/pdf",
                data: base64,
              } as any,
              {
                type: "text",
                text: "Extract and return ALL the text content from this PDF exactly as written. Do not summarize. Return only the raw text.",
              },
            ],
          ],
        ]);

        const extractChain = extractPrompt.pipe(model).pipe(new StringOutputParser());
        storyContent = await extractChain.invoke({});
      } else {
        return NextResponse.json(
          { error: "Only .txt, .md, or .pdf files are supported." },
          { status: 400 }
        );
      }
    } else if (rawText) {
      storyContent = rawText;
    } else {
      return NextResponse.json(
        { error: "Please upload a file or paste your story text." },
        { status: 400 }
      );
    }

    if (!storyContent.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the file. Please try a .txt file." },
        { status: 400 }
      );
    }

    // Truncate to avoid token limits on free tier
    const truncated = storyContent.slice(0, 8000);

    // Main analysis + screenplay generation
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.8,
      maxOutputTokens: 2000,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", ANALYSIS_SYSTEM_PROMPT],
      [
        "human",
        `Here is the raw story/idea from the user. Analyse it and then write a professional screenplay from it.

RAW STORY:
{story}

Remember to output BOTH sections with the exact markers:
===ANALYSIS===
[analysis]

===SCREENPLAY===
[screenplay]`,
      ],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const result = await callWithRetry(chain, { story: truncated });

    // Split the output into analysis + screenplay
    const analysisSplit = result.split("===ANALYSIS===");
    const screenplaySplit = result.split("===SCREENPLAY===");

    const analysis =
      analysisSplit.length > 1
        ? analysisSplit[1].split("===SCREENPLAY===")[0].trim()
        : "";

    const screenplay =
      screenplaySplit.length > 1 ? screenplaySplit[1].trim() : result.trim();

    return NextResponse.json({ analysis, screenplay });
  } catch (error: any) {
    console.error("Story analysis API error:", error);

    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("quota")) {
      return NextResponse.json(
        { error: "Gemini free tier limit reached. Wait 1 minute and try again." },
        { status: 429 }
      );
    }
    if (msg.includes("timeout") || msg.includes("deadline")) {
      return NextResponse.json(
        { error: "Request timed out. Try a shorter story or wait a moment." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

//test contriubution