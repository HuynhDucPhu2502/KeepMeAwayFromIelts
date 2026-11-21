// Pure Reading Sniper (True / False / Not Given) engine. Zero React imports, 100% Node-testable.
import type { Difficulty } from "../typing-engine";
import type { ReadingChallenge } from "./reading-data";

export type ReadingDifficultyFilter = "all" | Difficulty;

export const READING_ROUND_COUNTS = [5, 10, 15] as const;
export type ReadingRoundCount = (typeof READING_ROUND_COUNTS)[number];

export const READING_LIVES = 5;

export const READING_TIME_LIMITS: Record<ReadingDifficultyFilter, number> = {
  all: 20,
  easy: 25,
  normal: 18,
  hard: 14,
};

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Builds a shuffled deck filtered by difficulty (falling back to all if filtered pool is smaller than count). */
export function buildReadingDeck(
  all: readonly ReadingChallenge[],
  difficulty: ReadingDifficultyFilter,
  count: number,
  rand: () => number = Math.random,
): ReadingChallenge[] {
  const primary = difficulty === "all" ? [...all] : all.filter((c) => c.difficulty === difficulty);
  const shuffledPrimary = shuffle(primary, rand);
  if (shuffledPrimary.length >= count) {
    return shuffledPrimary.slice(0, count);
  }
  const used = new Set(shuffledPrimary.map((c) => c.id));
  const extras = shuffle(all.filter((c) => !used.has(c.id)), rand);
  return [...shuffledPrimary, ...extras].slice(0, Math.min(count, all.length));
}

export interface HighlightSplit {
  before: string;
  match: string;
  after: string;
}

/** Splits a passage around its exact evidence substring so the UI can highlight the proof inline. */
export function splitPassageHighlight(passage: string, evidence: string): HighlightSplit {
  if (!evidence) return { before: passage, match: "", after: "" };
  const idx = passage.indexOf(evidence);
  if (idx === -1) return { before: passage, match: "", after: "" };
  return {
    before: passage.slice(0, idx),
    match: passage.slice(idx, idx + evidence.length),
    after: passage.slice(idx + evidence.length),
  };
}

export function scoreReadingAnswer(
  correct: boolean,
  prevCombo: number,
  secondsLeft: number,
  timeLimit: number,
): { points: number; nextCombo: number } {
  if (!correct) return { points: 0, nextCombo: 0 };
  const nextCombo = prevCombo + 1;
  const comboMult = 1 + Math.min(nextCombo - 1, 6) * 0.2;
  const speedRatio = timeLimit > 0 ? Math.max(0, Math.min(1, secondsLeft / timeLimit)) : 0.4;
  const speedBonus = Math.round(speedRatio * 60);
  const points = Math.round((120 + speedBonus) * comboMult);
  return { points, nextCombo };
}

export function estimateReadingBand(accuracyPct: number, maxCombo: number): string {
  const raw = 5.0 + (accuracyPct / 100) * 3.5 + Math.min(maxCombo, 6) * 0.08;
  const clamped = Math.max(5.0, Math.min(9.0, raw));
  const rounded = Math.round(clamped * 2) / 2;
  return rounded.toFixed(1);
}
