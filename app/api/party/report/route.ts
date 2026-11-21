import { GoogleGenAI } from "@google/genai";
import { buildReportPrompt, cleanReportPlayers, fallbackCards, parseCards, type ReportPlayer } from "@/app/party/report-core";
import { hostPin, noStore, notFound, pinMatches, readJson, wrongPin } from "../pin";

const TIMEOUT_MS = 10_000;

async function geminiCards(players: ReportPlayer[]) {
  // Vertex AI with the service's own credentials (Cloud Run service account, or ADC locally).
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "global",
  });
  const call = ai.models.generateContent({
    // gemini-2.5-flash is no longer served to new projects (Nov 2026); 3.8 Flash is the current GA Flash.
    model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
    contents: buildReportPrompt(players),
    config: {
      responseMimeType: "application/json",
      temperature: 0.9,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });
  // The abort signal does not cover credential lookup, so race a timer as well.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Gemini timeout")), TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([call, timeout]);
    return parseCards(response.text ?? "", players);
  } finally {
    clearTimeout(timer);
  }
}

// POST { pin, players: ReportPlayer[] } → { cards, fallback }. Always 200 once the PIN is right.
export async function POST(request: Request) {
  if (!hostPin()) return notFound();
  const body = await readJson(request);
  if (!pinMatches(body.pin)) return wrongPin();
  const players = cleanReportPlayers(body.players);
  if (players.length === 0) return Response.json({ cards: [], fallback: true }, { headers: noStore });

  try {
    const cards = await geminiCards(players);
    if (cards) return Response.json({ cards, fallback: false }, { headers: noStore });
    console.warn("[party/report] Gemini answer could not be parsed, using template cards");
  } catch (error) {
    console.warn("[party/report] Gemini failed, using template cards:", error instanceof Error ? error.message : error);
  }
  return Response.json({ cards: fallbackCards(players), fallback: true }, { headers: noStore });
}
