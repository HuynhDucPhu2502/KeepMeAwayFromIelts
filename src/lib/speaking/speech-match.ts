// Pure speech transcript matching helpers for Speaking Part 2 Cue Cards.
// Zero React/DOM imports — 100% Node-testable.

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "my",
  "your",
  "his",
  "her",
  "our",
  "their",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "by",
  "out",
  "up",
  "down",
  "off",
  "as",
  "be",
  "is",
  "am",
  "are",
  "was",
  "were",
  "been",
]);

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Light English stemmer for spoken verbs/nouns (broadened -> broaden, horizons -> horizon). */
function stemToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) return token.slice(0, -3) + "y";
  if (token.endsWith("ing") && token.length > 5) {
    const base = token.slice(0, -3);
    // handle doubled consonant: stepping -> step
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) return base.slice(0, -1);
    return base;
  }
  if (token.endsWith("ed") && token.length > 4) {
    const base = token.slice(0, -2);
    if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) return base.slice(0, -1);
    return base;
  }
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenList(raw: string): string[] {
  const norm = normalizeText(raw);
  return norm ? norm.split(" ") : [];
}

/**
 * Returns the subset of `keywords` detected in the spoken `transcript`.
 * Matches both exact normalized phrases and stemmed content-word sequences
 * (so "broadened my horizons" matches "broaden my horizons", and "stepped out of my comfort zone" matches "step out of comfort zone").
 */
export function detectSpokenKeywords(transcript: string, keywords: readonly string[]): string[] {
  const normTranscript = normalizeText(transcript);
  if (!normTranscript) return [];

  const spokenTokens = tokenList(transcript);
  const spokenStems = new Set(spokenTokens.map(stemToken));

  const matched: string[] = [];
  for (const kw of keywords) {
    const normKw = normalizeText(kw);
    if (!normKw) continue;

    // 1. Direct phrase substring match (with word boundaries via padded spaces)
    if (` ${normTranscript} `.includes(` ${normKw} `)) {
      matched.push(kw);
      continue;
    }

    // 2. Content-word stem match (all meaningful words in the keyword appear in transcript)
    const kwTokens = normKw.split(" ");
    const contentTokens = kwTokens.filter((t) => !STOP_WORDS.has(t));
    const checkTokens = contentTokens.length > 0 ? contentTokens : kwTokens;
    const allPresent = checkTokens.every((t) => {
      const st = stemToken(t);
      if (spokenStems.has(st)) return true;
      // Also allow prefix match for longer academic roots (>=5 chars, e.g. motivate/motivated/motivation)
      if (st.length >= 5) {
        const root = st.slice(0, Math.min(st.length, 6));
        for (const s of spokenStems) {
          if (s.startsWith(root)) return true;
        }
      }
      return false;
    });

    if (allPresent) matched.push(kw);
  }

  return matched;
}

export function countSpokenWords(transcript: string): number {
  return tokenList(transcript).length;
}

export function computeSpeakingWpm(wordCount: number, elapsedSec: number): number {
  if (wordCount <= 0 || elapsedSec < 2) return 0;
  return Math.round((wordCount / elapsedSec) * 60);
}

const FILLER_REGEX = /\b(um+|uh+|erm+|hmm+|you know)\b/gi;

export function countFillers(transcript: string): number {
  const matches = transcript.match(FILLER_REGEX);
  return matches ? matches.length : 0;
}
