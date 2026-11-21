// Pure logic for the Listening, Vocab Blitz, and Word Scramble mini-games.
// Type-only imports so Node `--test` can run directly without bundling.
import type { Difficulty, Entry } from "../game/engine";

export interface DiffChar {
  char: string;
  ok: boolean;
}

export function normalizeTyped(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Compares what the player typed against the target word/phrase for instant spelling feedback. */
export function compareSpelling(typed: string, target: string): { exact: boolean; chars: DiffChar[] } {
  const a = normalizeTyped(typed);
  const b = normalizeTyped(target);
  const exact = a === b;
  const chars: DiffChar[] = [];
  for (let i = 0; i < b.length; i++) {
    chars.push({ char: b[i], ok: a[i] === b[i] });
  }
  return { exact, chars };
}

export function filterListeningPool(
  words: readonly Entry[],
  phrases: readonly Entry[],
  source: "words" | "phrases",
  difficulty: Difficulty,
): Entry[] {
  if (source === "phrases") {
    return phrases.filter((p) => p.text.length >= 4 && !!p.meaning);
  }
  const clean = words.filter((w) => /^[a-z]+$/i.test(w.text) && w.text.length >= 4 && !!w.meaning);
  if (difficulty === "easy") return clean.slice(0, 1200).filter((w) => w.text.length <= 8);
  if (difficulty === "normal") return clean.slice(0, 3200).filter((w) => w.text.length >= 5 && w.text.length <= 11);
  return clean.filter((w) => w.text.length >= 6);
}

export function filterBlitzPool(words: readonly Entry[], difficulty: Difficulty): Entry[] {
  const clean = words.filter((w) => !!w.meaning && w.meaning.trim().length > 0);
  if (difficulty === "easy") return clean.slice(0, 1500);
  if (difficulty === "normal") return clean.slice(0, 3500);
  return clean;
}

export interface BlitzQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  entry: Entry;
}

export type BlitzDirection = "en-vi" | "vi-en";

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Builds a 4-option Vocab Blitz question with guaranteed distinct options. */
export function buildBlitzQuestion(
  pool: readonly Entry[],
  direction: BlitzDirection,
  rand: () => number = Math.random,
  avoidText?: string,
): BlitzQuestion {
  const n = pool.length;
  let targetIdx = Math.floor(rand() * n);
  if (avoidText && n > 1 && pool[targetIdx].text === avoidText) {
    targetIdx = (targetIdx + 1) % n;
  }
  const entry = pool[targetIdx];
  const prompt = direction === "en-vi" ? entry.text : (entry.meaning ?? entry.text);
  const answer = direction === "en-vi" ? (entry.meaning ?? entry.text) : entry.text;

  const used = new Set<string>([answer.toLowerCase()]);
  const distractors: string[] = [];
  for (let attempts = 0; attempts < 80 && distractors.length < 3; attempts++) {
    const cand = pool[Math.floor(rand() * n)];
    const val = direction === "en-vi" ? (cand.meaning ?? cand.text) : cand.text;
    const key = val.toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      distractors.push(val);
    }
  }

  const mixed = shuffle(
    [{ text: answer, ok: true }, ...distractors.map((text) => ({ text, ok: false }))],
    rand,
  );
  return {
    prompt,
    choices: mixed.map((x) => x.text),
    correctIndex: mixed.findIndex((x) => x.ok),
    entry,
  };
}

export function blitzReward(nextStreak: number): { points: number; fever: boolean; bonusSec: number } {
  const fever = nextStreak >= 5;
  const bonusSec = nextStreak > 0 && nextStreak % 5 === 0 ? 2 : 0;
  return {
    points: fever ? 200 : 100,
    fever,
    bonusSec,
  };
}

export function filterScramblePool(words: readonly Entry[], difficulty: Difficulty): Entry[] {
  const clean = words.filter((w) => /^[a-z]+$/i.test(w.text) && !!w.meaning);
  if (difficulty === "easy") return clean.slice(0, 1500).filter((w) => w.text.length >= 4 && w.text.length <= 6);
  if (difficulty === "normal") return clean.slice(0, 3500).filter((w) => w.text.length >= 7 && w.text.length <= 9);
  return clean.filter((w) => w.text.length >= 9 && w.text.length <= 13);
}

export interface LetterTile {
  id: number;
  char: string;
}

/** Scrambles a word's letters, guaranteeing the scrambled order differs from the answer. */
export function scrambleWord(word: string, rand: () => number = Math.random): LetterTile[] {
  const lower = word.toLowerCase();
  const tiles: LetterTile[] = Array.from(lower, (char, id) => ({ id, char }));
  const uniqueChars = new Set(lower);
  if (tiles.length < 2 || uniqueChars.size < 2) return tiles;

  let mixed = shuffle(tiles, rand);
  for (let tries = 0; tries < 6 && mixed.map((t) => t.char).join("") === lower; tries++) {
    mixed = shuffle(tiles, rand);
  }
  if (mixed.map((t) => t.char).join("") === lower) {
    // Force swap two different letters
    const swapIdx = mixed.findIndex((t) => t.char !== mixed[0].char);
    if (swapIdx > 0) [mixed[0], mixed[swapIdx]] = [mixed[swapIdx], mixed[0]];
  }
  return mixed;
}

export function scramblePoints(wordLen: number, nextCombo: number, hintsUsed: number): number {
  const base = Math.max(60, wordLen * 20 - hintsUsed * 30);
  return base * Math.min(4, Math.max(1, nextCombo));
}
