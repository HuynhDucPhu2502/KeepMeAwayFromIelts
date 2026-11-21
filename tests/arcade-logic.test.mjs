// Pure tests for Listening, Vocab Blitz, Word Scramble, and Speaking data. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blitzReward,
  buildBlitzQuestion,
  compareSpelling,
  filterBlitzPool,
  filterListeningPool,
  filterScramblePool,
  scramblePoints,
  scrambleWord,
} from "../app/arcade/arcade-logic.ts";
import { SPEAKING_CLOZE, SPEAKING_CUE_CARDS } from "../app/speaking/speaking-data.ts";

const SAMPLE_WORDS = [
  { text: "apple", meaning: "quả táo" },
  { text: "river", meaning: "dòng sông" },
  { text: "budget", meaning: "ngân sách" },
  { text: "evidence", meaning: "bằng chứng" },
  { text: "sustainable", meaning: "bền vững" },
  { text: "accommodation", meaning: "chỗ ở" },
];

test("compareSpelling detects exact matches and flags wrong/missing letters", () => {
  const ok = compareSpelling("  Budget ", "budget");
  assert.equal(ok.exact, true);
  assert.ok(ok.chars.every((c) => c.ok));

  const bad = compareSpelling("budgit", "budget");
  assert.equal(bad.exact, false);
  assert.equal(bad.chars[4].char, "e");
  assert.equal(bad.chars[4].ok, false);
});

test("buildBlitzQuestion always produces 4 distinct options with a valid correctIndex", () => {
  const pool = filterBlitzPool(SAMPLE_WORDS, "hard");
  const q1 = buildBlitzQuestion(pool, "en-vi", Math.random);
  assert.equal(q1.choices.length, 4);
  assert.equal(new Set(q1.choices).size, 4);
  assert.equal(q1.choices[q1.correctIndex], q1.entry.meaning);

  const q2 = buildBlitzQuestion(pool, "vi-en", Math.random);
  assert.equal(q2.choices.length, 4);
  assert.equal(new Set(q2.choices).size, 4);
  assert.equal(q2.choices[q2.correctIndex], q2.entry.text);
});

test("blitzReward triggers Fever Mode at streak 5 and adds +2s every 5 streak", () => {
  assert.deepEqual(blitzReward(1), { points: 100, fever: false, bonusSec: 0 });
  assert.deepEqual(blitzReward(4), { points: 100, fever: false, bonusSec: 0 });
  assert.deepEqual(blitzReward(5), { points: 200, fever: true, bonusSec: 2 });
  assert.deepEqual(blitzReward(6), { points: 200, fever: true, bonusSec: 0 });
  assert.deepEqual(blitzReward(10), { points: 200, fever: true, bonusSec: 2 });
});

test("scrambleWord always changes letter order and preserves exact letters", () => {
  const tiles = scrambleWord("budget", () => 0.9999);
  assert.equal(tiles.length, 6);
  assert.notEqual(tiles.map((t) => t.char).join(""), "budget");
  assert.equal(
    tiles
      .map((t) => t.char)
      .sort()
      .join(""),
    "bdegtu",
  );
  assert.ok(scramblePoints(7, 2, 0) > scramblePoints(7, 2, 1));
});

test("pool filters and speaking data are well-formed", () => {
  assert.ok(filterListeningPool(SAMPLE_WORDS, [], "words", "easy").length > 0);
  assert.ok(filterScramblePool(SAMPLE_WORDS, "easy").every((w) => w.text.length >= 4 && w.text.length <= 6));
  assert.ok(SPEAKING_CLOZE.length >= 10);
  for (const q of SPEAKING_CLOZE) {
    assert.ok(q.sentence.includes("___"));
    assert.ok(q.answer >= 0 && q.answer < q.choices.length);
  }
  assert.ok(SPEAKING_CUE_CARDS.length >= 4);
  for (const c of SPEAKING_CUE_CARDS) {
    assert.equal(c.keywords.length, 4);
  }
});
