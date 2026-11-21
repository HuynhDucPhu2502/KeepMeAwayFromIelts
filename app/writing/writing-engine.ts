// Pure Writing Sprint game engine (type-only imports so Node tests can load it directly).
import type { ChoiceChallenge, OrderChallenge, WritingChallenge } from "./writing-data";

export type WritingMode = "task1" | "task2" | "mixed";
export const WRITING_LIVES = 5;
export const WRITING_ROUND_COUNTS = [6, 10, 15] as const;
export type WritingRoundCount = (typeof WRITING_ROUND_COUNTS)[number];

export interface PreparedChoice extends ChoiceChallenge {
  /** Shuffled display choices and the new index of the correct choice. */
  displayChoices: string[];
  correctIndex: number;
}

export interface PreparedOrder extends OrderChallenge {
  /** Permutation of [0, 1, 2, 3] shown to the player; value = original step index. */
  shuffledIndices: number[];
}

export type PreparedChallenge = PreparedChoice | PreparedOrder;

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function prepareChallenge(challenge: WritingChallenge, rand: () => number): PreparedChallenge {
  if (challenge.kind === "order") {
    const base = challenge.steps.map((_, i) => i);
    const perm = shuffle(base, rand);
    // Guarantee the shuffled tiles aren't already in exact solved order.
    if (perm.every((v, i) => v === i) && perm.length >= 2) {
      [perm[0], perm[1]] = [perm[1], perm[0]];
    }
    return { ...challenge, shuffledIndices: perm };
  }

  if (challenge.kind === "verify") {
    // Keep "Chuẩn ✓ / Sai ✕" in fixed readable order.
    return { ...challenge, displayChoices: [...challenge.choices], correctIndex: challenge.answer };
  }

  const indexed = challenge.choices.map((text, idx) => ({ text, isAnswer: idx === challenge.answer }));
  const mixed = shuffle(indexed, rand);
  return {
    ...challenge,
    displayChoices: mixed.map((x) => x.text),
    correctIndex: mixed.findIndex((x) => x.isAnswer),
  };
}

/** Builds a shuffled deck for the requested mode and length. */
export function buildWritingDeck(
  allChallenges: readonly WritingChallenge[],
  mode: WritingMode,
  count: number,
  rand: () => number = Math.random,
): PreparedChallenge[] {
  const pool =
    mode === "mixed"
      ? allChallenges
      : allChallenges.filter((c) => c.task === mode);

  const picked = shuffle(pool, rand).slice(0, Math.min(count, pool.length));
  return picked.map((c) => prepareChallenge(c, rand));
}

export function isOrderCorrect(pickedOriginalIndices: readonly number[], expectedLength: number): boolean {
  return (
    pickedOriginalIndices.length === expectedLength &&
    pickedOriginalIndices.every((origIdx, pos) => origIdx === pos)
  );
}

export interface ScoreResult {
  points: number;
  nextCombo: number;
  speedBonus: boolean;
}

export function scoreWritingAnswer(
  correct: boolean,
  prevCombo: number,
  elapsedSec: number,
  isOrder: boolean,
): ScoreResult {
  if (!correct) return { points: 0, nextCombo: 0, speedBonus: false };
  const nextCombo = prevCombo + 1;
  const base = isOrder ? 180 : 100;
  const mult = Math.min(5, nextCombo);
  const speedBonus = elapsedSec <= (isOrder ? 20 : 8);
  return {
    points: base * mult + (speedBonus ? 50 : 0),
    nextCombo,
    speedBonus,
  };
}

/** Estimates a fun IELTS Writing Band (5.0–9.0 in 0.5 steps) from accuracy and streak. */
export function estimateWritingBand(correct: number, total: number, maxCombo: number): string {
  if (total <= 0) return "5.0";
  const ratio = Math.max(0, Math.min(1, correct / total));
  const raw = 5.0 + ratio * 3.5 + (maxCombo >= 5 ? 0.5 : 0);
  const snapped = Math.min(9.0, Math.max(5.0, Math.round(raw * 2) / 2));
  return snapped.toFixed(1);
}
