// Pure Paraphrase Lab (Writing Game #2) engine. Zero React imports, 100% Node-testable.
import type { BuildChallenge, ErrorChallenge, LabChallenge, UpgradeChallenge } from "./lab-data";

export type LabMode = "mixed" | "upgrade" | "error" | "build";
export const LAB_LIVES = 5;
export const LAB_ROUND_COUNTS = [6, 10, 15] as const;
export type LabRoundCount = (typeof LAB_ROUND_COUNTS)[number];

export interface PreparedError extends ErrorChallenge {
  displayFixes: string[];
  correctDisplayFix: number;
}

export interface PreparedBuild extends BuildChallenge {
  /** Permutation of [0..tiles.length-1] shown in the word bank. */
  shuffledOrder: number[];
}

export type PreparedLabChallenge = UpgradeChallenge | PreparedError | PreparedBuild;

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Normalizes user typed English answers for fair, punctuation-tolerant comparison. */
export function normalizeLabAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,!?;:'"’‘`()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns true if the typed phrase matches any accepted Band 8 variation. */
export function isUpgradeMatch(input: string, accepted: readonly string[]): boolean {
  const norm = normalizeLabAnswer(input);
  if (!norm) return false;
  return accepted.some((candidate) => normalizeLabAnswer(candidate) === norm);
}

/** Generates a progressive hint showing the first letters of each word in the canonical phrase. */
export function buildUpgradeHint(canonical: string): string {
  return canonical
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w[0] + "_" : `${w[0]}${"_".repeat(Math.min(5, w.length - 1))}`))
    .join(" ");
}

export function prepareLabChallenge(challenge: LabChallenge, rand: () => number = Math.random): PreparedLabChallenge {
  if (challenge.kind === "upgrade") {
    return challenge;
  }
  if (challenge.kind === "error") {
    const indexed = challenge.fixes.map((text, idx) => ({ text, ok: idx === challenge.correctFix }));
    const mixed = shuffle(indexed, rand);
    return {
      ...challenge,
      displayFixes: mixed.map((x) => x.text),
      correctDisplayFix: mixed.findIndex((x) => x.ok),
    };
  }
  const base = challenge.tiles.map((_, i) => i);
  const perm = shuffle(base, rand);
  if (perm.every((v, i) => v === i) && perm.length >= 2) {
    [perm[0], perm[1]] = [perm[1], perm[0]];
  }
  return { ...challenge, shuffledOrder: perm };
}

/** Builds a shuffled deck filtered by mode (filling from remaining items if needed). */
export function buildLabDeck(
  all: readonly LabChallenge[],
  mode: LabMode,
  count: number,
  rand: () => number = Math.random,
): PreparedLabChallenge[] {
  const primary = mode === "mixed" ? [...all] : all.filter((c) => c.kind === mode);
  const shuffledPrimary = shuffle(primary, rand);
  if (shuffledPrimary.length >= count) {
    return shuffledPrimary.slice(0, count).map((c) => prepareLabChallenge(c, rand));
  }
  const used = new Set(shuffledPrimary.map((c) => c.id));
  const extras = shuffle(
    all.filter((c) => !used.has(c.id)),
    rand,
  );
  return [...shuffledPrimary, ...extras].slice(0, Math.min(count, all.length)).map((c) => prepareLabChallenge(c, rand));
}

export function isBuildCorrect(pickedTileIndices: readonly number[], expectedLength: number): boolean {
  if (pickedTileIndices.length !== expectedLength) return false;
  return pickedTileIndices.every((tileIdx, pos) => tileIdx === pos);
}

export function scoreLabAnswer(ok: boolean, prevCombo: number, usedHint: boolean): { points: number; nextCombo: number } {
  if (!ok) return { points: 0, nextCombo: 0 };
  const nextCombo = prevCombo + 1;
  const base = usedHint ? 70 : 120;
  const comboBonus = Math.min(4, nextCombo - 1) * 25;
  return { points: base + comboBonus, nextCombo };
}

export function estimateLabBand(correct: number, total: number, maxCombo: number): string {
  const ratio = total > 0 ? correct / total : 0;
  const raw = 5.0 + ratio * 3.5 + Math.min(0.5, maxCombo * 0.08);
  const clamped = Math.max(5.0, Math.min(9.0, raw));
  return (Math.round(clamped * 2) / 2).toFixed(1);
}
