import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

// Condensed rules — same knowledge, much fewer tokens
const SCREENPLAY_SYSTEM_PROMPT = `
You are a professional Oscar-level screenplay writer.

STRICT FORMATTING RULES:
- Scene heading in CAPS: INT./EXT./I/E. LOCATION — DAY/NIGHT/CONTINUOUS
- Action lines in present tense. Only what camera can SEE or HEAR. No internal thoughts.
- Show emotions through physical behavior only. Example: "He clenches his fist, lips trembling."
- First appearance: CHARACTER NAME (age) in CAPS. Example: DEEPAK (24) sits nervously.
- Dialogue centered, character name above in CAPS.
- CONT'D when same character speaks after an action line interruption.
- V.O. for voiceover narration. O.S. for off-screen voice in same location.
- Parentheticals (in brackets) for tone/minor action during dialogue. Use sparingly.
- Transitions flush right: CUT TO: / DISSOLVE TO: / SMASH CUT TO: / FADE TO BLACK.
- 1 page = 1 minute of screen time. Keep scenes tight.
- Dialogue must be natural Hinglish (Hindi + English mix).
- Never reveal plot or summarize. Unfold moment by moment.
- Maximum 3-4 lines per action block.

Write directly. Start with scene heading. No preamble.
`;

// Add this helper above your POST function
async function callWithRetry(chain: any, input: any, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await chain.invoke(input);
    } catch (error: any) {
      const is429 = error.message?.includes("429") || error.message?.includes("quota");
      if (is429 && i < retries) {
        await new Promise(res => setTimeout(res, 15000)); // wait 15s then retry
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached");
}


export async function POST(req: NextRequest) {
  try {
    const { userRequest } = await req.json();

    if (!userRequest || typeof userRequest !== "string") {
      return NextResponse.json(
        { error: "userRequest is required" },
        { status: 400 }
      );
    }

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.85,
      maxOutputTokens: 1500,  // reduced — free tier safe
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SCREENPLAY_SYSTEM_PROMPT],
      [
        "human",
        `Write a 2-3 page screenplay for: {userRequest}
         Dialogue in Hinglish. Begin with scene heading directly.`,
      ],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
   const screenplay = await callWithRetry(chain, { userRequest });

    return NextResponse.json({ screenplay });

  } catch (error: any) {
    console.error("Screenplay API error:", error);

    // Friendly error messages for common Gemini free tier issues
    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("quota")) {
      return NextResponse.json(
        { error: "Gemini free tier limit reached. Wait 1 minute and try again." },
        { status: 429 }
      );
    }
    if (msg.includes("timeout") || msg.includes("deadline")) {
      return NextResponse.json(
        { error: "Request timed out. Try a shorter prompt or wait a moment." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}