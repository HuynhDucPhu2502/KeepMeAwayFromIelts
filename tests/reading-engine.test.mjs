// Pure Reading Sniper (True / False / Not Given) tests. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { READING_CHALLENGES } from "../src/lib/reading/reading-data.ts";
import {
  buildReadingDeck,
  estimateReadingBand,
  scoreReadingAnswer,
  splitPassageHighlight,
} from "../src/lib/reading/reading-engine.ts";

test("all reading challenges have valid evidence substrings and balanced verdicts", () => {
  assert.ok(READING_CHALLENGES.length >= 24);
  const counts = { TRUE: 0, FALSE: 0, NOT_GIVEN: 0 };
  const ids = new Set();

  for (const c of READING_CHALLENGES) {
    assert.ok(!ids.has(c.id), `Duplicate challenge id: ${c.id}`);
    ids.add(c.id);
    assert.ok(c.passage.includes(c.evidence), `Evidence missing in passage for ${c.id}`);
    assert.ok(c.statement.length > 10);
    assert.ok(c.explanation.length > 10);
    counts[c.answer] += 1;
  }

  assert.equal(counts.TRUE, 8);
  assert.equal(counts.FALSE, 8);
  assert.equal(counts.NOT_GIVEN, 8);
});

test("buildReadingDeck filters by difficulty and fills requested count without duplicates", () => {
  const easy5 = buildReadingDeck(READING_CHALLENGES, "easy", 5);
  assert.equal(easy5.length, 5);
  assert.ok(easy5.every((c) => c.difficulty === "easy"));

  const hard15 = buildReadingDeck(READING_CHALLENGES, "hard", 15);
  assert.equal(hard15.length, 15);
  assert.equal(new Set(hard15.map((c) => c.id)).size, 15);
  // First 8 come from the hard pool
  assert.equal(hard15.slice(0, 8).filter((c) => c.difficulty === "hard").length, 8);
});

test("splitPassageHighlight isolates the exact evidence text inside the passage", () => {
  const c = READING_CHALLENGES[0];
  const parts = splitPassageHighlight(c.passage, c.evidence);
  assert.equal(parts.match, c.evidence);
  assert.equal(parts.before + parts.match + parts.after, c.passage);

  const fallback = splitPassageHighlight("Short text.", "missing");
  assert.equal(fallback.before, "Short text.");
  assert.equal(fallback.match, "");
});

test("scoreReadingAnswer scales with combo and speed and resets on mistake", () => {
  const fast = scoreReadingAnswer(true, 0, 18, 20);
  const slow = scoreReadingAnswer(true, 0, 2, 20);
  assert.ok(fast.points > slow.points);
  assert.equal(fast.nextCombo, 1);

  const streak = scoreReadingAnswer(true, 4, 15, 20);
  assert.equal(streak.nextCombo, 5);
  assert.ok(streak.points > fast.points);

  const wrong = scoreReadingAnswer(false, 4, 15, 20);
  assert.equal(wrong.points, 0);
  assert.equal(wrong.nextCombo, 0);
});

test("estimateReadingBand maps scores to 5.0-9.0 in 0.5 steps", () => {
  assert.equal(estimateReadingBand(0, 0), "5.0");
  assert.equal(estimateReadingBand(100, 6), "9.0");
  const mid = Number(estimateReadingBand(70, 3));
  assert.ok(mid >= 5.0 && mid <= 9.0);
  assert.equal((mid * 10) % 5, 0);
});
