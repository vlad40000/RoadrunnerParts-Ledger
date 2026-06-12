import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

export const runtime = "nodejs";

const RequestSchema = z.object({
  image: z.string().min(1, "image is required"),
});

const PROMPT = 
  "Look at this machine nameplate photo. Extract the manufacturer/brand name, the model number/name, and the serial number. " +
  "Return a JSON object with keys 'brand', 'model', and 'serial'. " +
  "For any missing values, return an empty string. " +
  "Do not include any extra words, formatting, or explanation outside of the JSON object.";

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

  const { image } = parsed.data;

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
            { text: PROMPT },
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
            brand: {
              type: Type.STRING,
              description: "The extracted brand or manufacturer.",
            },
            model: {
              type: Type.STRING,
              description: "The extracted model number or name.",
            },
            serial: {
              type: Type.STRING,
              description: "The extracted serial number.",
            },
          },
          required: ["brand", "model", "serial"],
        },
      },
    });

    const raw = result.text ?? "";
    let extracted = { brand: "", model: "", serial: "" };
    try {
      const data = JSON.parse(raw) as Partial<typeof extracted>;
      extracted = {
        brand: data.brand?.trim() ?? "",
        model: data.model?.trim() ?? "",
        serial: data.serial?.trim() ?? "",
      };
    } catch {
      // Fallback: if JSON parse fails, just return empty values
      console.warn("[api/ocr] Failed to parse JSON response:", raw);
    }

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[api/ocr] Gemini error:", err);
    return NextResponse.json({ error: "OCR extraction failed." }, { status: 500 });
  }
}
