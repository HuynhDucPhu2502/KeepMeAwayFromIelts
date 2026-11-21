// Party-mode behaviour of the pure game engine. Run with `npm test` (Node's built-in runner,
// which strips TypeScript types natively, so the engine is imported straight from source).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DIFFICULTIES,
  RANDS_PER_TICK,
  buildPool,
  initialState,
  partyPool,
  reducer,
  seededRandom,
} from "../src/lib/typing-engine.ts";

const WORDS = JSON.parse(readFileSync(new URL("../data/words.json", import.meta.url), "utf8"));
const PHRASES = JSON.parse(readFileSync(new URL("../data/phrases.json", import.meta.url), "utf8"));

/** Plays a run without typing and returns the texts of the first `count` words that spawn. */
function spawnedTexts({ party, dt, count, randFn }) {
  const pool = partyPool("words", "easy", WORDS, PHRASES);
  let state = reducer(initialState(), { type: "start", pool, best: 0, mode: "words", difficulty: "easy", party });
  const seen = new Map();
  for (let i = 0; i < 200_000 && seen.size < count && state.status === "playing"; i++) {
    state = reducer(state, { type: "tick", dt, rand: Array.from({ length: RANDS_PER_TICK }, randFn) });
    for (const item of state.items) if (!seen.has(item.id)) seen.set(item.id, item.text);
    // Clear the lowest word before it lands so the run lasts long enough.
    const low = state.items.find((it) => it.y > 0.6 && it.kind !== "boss");
    if (low) state = reducer(state, { type: "input", value: low.text });
  }
  return [...seen.values()].slice(0, count);
}

test("seededRandom is deterministic and in [0, 1)", () => {
  for (let n = 0; n < 1000; n++) {
    const a = seededRandom(42, n);
    assert.equal(a, seededRandom(42, n));
    assert.ok(a >= 0 && a < 1);
  }
  assert.notEqual(seededRandom(42, 0), seededRandom(43, 0));
});

test("party: same seed gives the same word order regardless of frame rate", () => {
  const a = spawnedTexts({ party: { seed: 1234 }, dt: 1 / 60, count: 12, randFn: Math.random });
  const b = spawnedTexts({ party: { seed: 1234 }, dt: 1 / 120, count: 12, randFn: Math.random });
  assert.equal(a.length, 12);
  assert.deepEqual(a, b);
});

test("party: different seeds give different word orders", () => {
  const a = spawnedTexts({ party: { seed: 1 }, dt: 1 / 60, count: 8, randFn: Math.random });
  const b = spawnedTexts({ party: { seed: 2 }, dt: 1 / 60, count: 8, randFn: Math.random });
  assert.notDeepEqual(a, b);
});

test("party: pause and continue are ignored", () => {
  const pool = partyPool("words", "easy", WORDS, PHRASES);
  const playing = reducer(initialState(), { type: "start", pool, best: 0, party: { seed: 7 } });
  assert.equal(reducer(playing, { type: "pause" }).status, "playing");
  const over = { ...playing, status: "over", lives: 0 };
  assert.equal(reducer(over, { type: "continue" }).status, "over");
});

test("party: the pool is the fixed most-frequent slice for the difficulty", () => {
  const easy = partyPool("words", "easy", WORDS, PHRASES);
  assert.equal(easy.length, DIFFICULTIES.easy.words.start);
  assert.deepEqual(easy, buildPool("words", "easy", WORDS, PHRASES).slice(0, DIFFICULTIES.easy.words.start));
  const hard = partyPool("words", "hard", WORDS, PHRASES);
  assert.equal(hard.length, buildPool("words", "hard", WORDS, PHRASES).length);
});

test("solo is unchanged: no party state and picks come from the tick's randoms", () => {
  const pool = buildPool("words", "normal", WORDS, PHRASES);
  let state = reducer(initialState(), { type: "start", pool, best: 0 });
  assert.equal(state.party, null);
  for (let i = 0; i < 120 && state.items.length === 0; i++) {
    state = reducer(state, { type: "tick", dt: 1 / 60, rand: new Array(RANDS_PER_TICK).fill(0) });
  }
  assert.equal(state.items[0].text, pool[0].text);
  assert.equal(reducer(state, { type: "pause" }).status, "paused");
});
