import { NextRequest, NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

const GRAPH_SYSTEM_PROMPT = `
You are a screenplay analyst. Given a screenplay or story, extract:

1. All characters
2. Relationships between characters
3. Scene-by-scene beat sheet

Return ONLY valid JSON. No markdown. No explanation. No backticks.

JSON structure:
{
  "characters": [
    {
      "id": "char_1",
      "name": "CHARACTER NAME",
      "age": 25,
      "role": "protagonist",
      "description": "one line description",
      "color": "#e8c84a"
    }
  ],
  "relationships": [
    {
      "source": "char_1",
      "target": "char_2",
      "type": "loves",
      "label": "secret love",
      "strength": 3
    }
  ],
  "beats": [
    {
      "id": "beat_1",
      "name": "Opening Image",
      "page": 1,
      "type": "setup",
      "description": "brief description of what happens",
      "act": 1
    }
  ]
}

Relationship types (use exactly these): loves, betrays, conflicts, allies, family, mentor, rivals, fears, protects
Strength: 1=weak, 2=medium, 3=strong

Role colors — assign these based on role:
- protagonist: #e8c84a
- antagonist: #ff6b6b
- supporting: #7aaee8
- love_interest: #e87ab0
- mentor: #7ec8a4
- comic_relief: #b07ae8

Beat types (use exactly these): setup, inciting, turning, midpoint, crisis, climax, resolution
Act: 1, 2, or 3

Standard beat sheet (map your story to these):
- Opening Image (page 1, setup, act 1)
- Setup (pages 1-10, setup, act 1)
- Inciting Incident (page 12, inciting, act 1)
- First Turning Point (page 25, turning, act 1)
- Midpoint (page 50, midpoint, act 2)
- Crisis (page 75, crisis, act 2)
- Second Turning Point (page 85, turning, act 2)
- Climax (page 90, climax, act 3)
- Resolution (page 100, resolution, act 3)

Extract as many real beats as you can identify from the story. If page numbers aren't clear, estimate based on story position.
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
    const { screenplay } = await req.json();

    if (!screenplay || typeof screenplay !== "string") {
      return NextResponse.json({ error: "screenplay text is required" }, { status: 400 });
    }

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-lite",
      apiKey: process.env.GOOGLE_API_KEY!,
      temperature: 0.1,
      maxOutputTokens: 2000,
    });

    // Configured with mustache to bypass the system prompt's single curly braces syntax
    const prompt = ChatPromptTemplate.fromMessages(
      [
        ["system", GRAPH_SYSTEM_PROMPT],
        ["human", "Analyse this screenplay and return the JSON:\n\n{{screenplay}}"],
      ],
      { templateFormat: "mustache" }
    );

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const raw = await callWithRetry(chain, { screenplay: screenplay.slice(0, 6000) });

    // FIXED: Placed completely on a single line to prevent syntax evaluation failure
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Graph API error:", error);
    const msg = error.message || "";
    if (msg.includes("429") || msg.includes("quota")) {
      return NextResponse.json({ error: "Rate limit reached. Wait a moment." }, { status: 429 });
    }
    if (msg.includes("JSON") || msg.includes("parse")) {
      return NextResponse.json({ error: "Could not parse character data. Try again." }, { status: 422 });
    }
    return NextResponse.json({ error: msg || "Something went wrong" }, { status: 500 });
  }
}