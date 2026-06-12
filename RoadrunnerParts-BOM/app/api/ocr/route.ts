import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

export const runtime = "nodejs";

const RequestSchema = z.object({
  image: z.string().min(1, "image is required"),
  field: z.enum(["brand", "model", "serial", "machine_id"]),
});

const FIELD_PROMPTS: Record<string, string> = {
  brand:
    "Look at this machine nameplate photo. Extract only the manufacturer or brand name. Return a single plain-text string — no extra words, no punctuation, no explanation.",
  model:
    "Look at this machine nameplate photo. Extract only the model number or model name. Return a single plain-text string — no extra words, no punctuation, no explanation.",
  serial:
    "Look at this machine nameplate photo. Extract only the serial number. Return a single plain-text string — no extra words, no punctuation, no explanation.",
  machine_id:
    "Look at this image. Extract any visible asset tag, machine ID, or equipment number. Return a single plain-text string — no extra words, no punctuation, no explanation.",
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on this server." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { image, field } = parsed.data;

  // Validate and strip the data URL prefix
  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json(
      { error: "image must be a base64 data URL (e.g. data:image/jpeg;base64,...)" },
      { status: 422 }
    );
  }
  const mimeType = match[1];
  const base64Data = match[2];

  try {
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: FIELD_PROMPTS[field] },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            value: {
              type: Type.STRING,
              description: "The extracted field value from the nameplate image.",
            },
          },
          required: ["value"],
        },
      },
    });

    const raw = result.text ?? "";
    let value = "";
    try {
      const data = JSON.parse(raw) as { value?: string };
      value = data.value?.trim() ?? raw.trim();
    } catch {
      // Fallback: model returned plain text instead of JSON
      value = raw.trim();
    }

    return NextResponse.json({ value });
  } catch (err) {
    console.error("[api/ocr] Gemini error:", err);
    return NextResponse.json({ error: "OCR extraction failed." }, { status: 500 });
  }
}
