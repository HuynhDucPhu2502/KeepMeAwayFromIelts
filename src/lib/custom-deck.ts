// Pure Custom Word Deck parser, URL encoder/decoder, and localStorage helpers.
// Zero React imports; pure functions are 100% Node-testable.
import type { Entry } from "./typing-engine";

export interface CustomDeck {
  name: string;
  entries: Entry[];
}

export const MAX_CUSTOM_DECK_WORDS = 80;
export const CUSTOM_DECK_STORAGE_KEY = "kmafi:custom-deck:v1";

export const SAMPLE_DECKS: CustomDeck[] = [
  {
    name: "IELTS Environment Band 8",
    entries: [
      { text: "mitigate", meaning: "giảm thiểu tác động xấu" },
      { text: "sustainable", meaning: "bền vững" },
      { text: "deforestation", meaning: "nạn phá rừng" },
      { text: "biodiversity", meaning: "đa dạng sinh học" },
      { text: "emission", meaning: "khí thải" },
      { text: "renewable", meaning: "có thể tái tạo" },
      { text: "conservation", meaning: "sự bảo tồn" },
      { text: "ecosystem", meaning: "hệ sinh thái" },
      { text: "pollutant", meaning: "chất gây ô nhiễm" },
      { text: "resilient", meaning: "có sức chống chịu tốt" },
    ],
  },
  {
    name: "IELTS Technology Band 8",
    entries: [
      { text: "ubiquitous", meaning: "có mặt ở khắp nơi" },
      { text: "automation", meaning: "tự động hóa" },
      { text: "obsolete", meaning: "lỗi thời" },
      { text: "breakthrough", meaning: "bước đột phá" },
      { text: "algorithm", meaning: "thuật toán" },
      { text: "surveillance", meaning: "sự giám sát" },
      { text: "cybersecurity", meaning: "an ninh mạng" },
      { text: "digitalize", meaning: "số hóa" },
      { text: "innovative", meaning: "mang tính đổi mới" },
      { text: "disruptive", meaning: "tạo thay đổi đột phá" },
    ],
  },
  {
    name: "IELTS Education Band 8",
    entries: [
      { text: "curriculum", meaning: "chương trình giảng dạy" },
      { text: "pedagogy", meaning: "phương pháp sư phạm" },
      { text: "literacy", meaning: "khả năng đọc viết" },
      { text: "vocational", meaning: "thuộc về hướng nghiệp" },
      { text: "proficiency", meaning: "sự thành thạo" },
      { text: "cognitive", meaning: "thuộc về nhận thức" },
      { text: "tuition", meaning: "học phí" },
      { text: "scholarship", meaning: "học bổng" },
      { text: "plagiarism", meaning: "đạo văn" },
      { text: "discipline", meaning: "kỷ luật / ngành học" },
    ],
  },
];

/**
 * Parses pasted lines into Entry[] (supports `-`, `:`, `|`, `=`, or Tab separators).
 * Deduplicates case-insensitively and caps at MAX_CUSTOM_DECK_WORDS.
 */
export function parseDeckText(raw: string): { entries: Entry[]; skipped: number } {
  const lines = raw.split(/\r?\n/);
  const entries: Entry[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Split on tab, ` - `, ` : `, ` | `, ` = `, or first `:` / `|` / `=`
    let wordPart = line;
    let meaningPart = "";
    const sepMatch = line.match(/\t|\s+[-–—:|=/]\s+|[:|=]/);
    if (sepMatch && sepMatch.index !== undefined) {
      wordPart = line.slice(0, sepMatch.index);
      meaningPart = line.slice(sepMatch.index + sepMatch[0].length);
    }

    const cleanWord = wordPart
      .trim()
      .replace(/^[\d]+[.)]\s*/, "") // strip leading list numbers like "1. mitigate"
      .replace(/\s+/g, " ")
      .toLowerCase();

    // Keep English letters, spaces, hyphens, apostrophes; must contain at least 2 letters
    if (!/^[a-z][a-z\s'-]{1,40}$/.test(cleanWord) || (cleanWord.match(/[a-z]/g)?.length ?? 0) < 2) {
      skipped += 1;
      continue;
    }

    if (seen.has(cleanWord)) continue;
    seen.add(cleanWord);

    entries.push({
      text: cleanWord,
      meaning: meaningPart.trim().slice(0, 120),
    });

    if (entries.length >= MAX_CUSTOM_DECK_WORDS) break;
  }

  return { entries, skipped };
}

export function formatDeckText(entries: readonly Entry[]): string {
  return entries.map((e) => (e.meaning ? `${e.text} - ${e.meaning}` : e.text)).join("\n");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(str: string): Uint8Array | null {
  try {
    const pad = (4 - (str.length % 4)) % 4;
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
    if (typeof atob === "function") {
      const binary = atob(b64);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(b64, "base64"));
  } catch {
    return null;
  }
}

/** Encodes a CustomDeck into a compact URL-safe token (supports Vietnamese UTF-8 meanings). */
export function encodeDeck(deck: CustomDeck): string {
  const compact = {
    n: deck.name.trim().slice(0, 60) || "Bộ từ riêng",
    e: deck.entries.slice(0, MAX_CUSTOM_DECK_WORDS).map((item) => (item.meaning ? [item.text, item.meaning] : [item.text])),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  return bytesToBase64Url(bytes);
}

/** Decodes a URL token back into a validated CustomDeck, or returns null if malformed. */
export function decodeDeck(token: string): CustomDeck | null {
  if (!token || token.length > 16000) return null;
  const bytes = base64UrlToBytes(token.trim());
  if (!bytes) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as { n?: unknown; e?: unknown };
    if (!Array.isArray(obj.e) || obj.e.length === 0) return null;

    const rawLines: string[] = [];
    for (const row of obj.e) {
      if (!Array.isArray(row) || typeof row[0] !== "string") continue;
      const w = row[0].trim();
      const m = typeof row[1] === "string" ? row[1].trim() : "";
      rawLines.push(m ? `${w}\t${m}` : w);
    }
    const { entries } = parseDeckText(rawLines.join("\n"));
    if (entries.length === 0) return null;
    const name = typeof obj.n === "string" && obj.n.trim() ? obj.n.trim().slice(0, 60) : "Bộ từ được chia sẻ";
    return { name, entries };
  } catch {
    return null;
  }
}

export function saveCustomDeck(deck: CustomDeck): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_DECK_STORAGE_KEY, JSON.stringify(deck));
  } catch {
    // Ignore private mode / quota errors
  }
}

export function loadCustomDeck(): CustomDeck | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_DECK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomDeck>;
    if (!Array.isArray(parsed.entries) || parsed.entries.length === 0) return null;
    const clean = parsed.entries.filter(
      (e): e is Entry => !!e && typeof e.text === "string" && e.text.length >= 2 && typeof e.meaning === "string",
    );
    if (clean.length === 0) return null;
    return {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Bộ từ riêng",
      entries: clean.slice(0, MAX_CUSTOM_DECK_WORDS),
    };
  } catch {
    return null;
  }
}

export function clearCustomDeck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CUSTOM_DECK_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
