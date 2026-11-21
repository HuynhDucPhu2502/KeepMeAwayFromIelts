// Pure Writing Sprint engine tests. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WRITING_CHALLENGES, WRITING_EXERCISES } from "../app/writing/writing-data.ts";
import {
  buildWritingDeck,
  estimateWritingBand,
  isOrderCorrect,
  prepareChallenge,
  scoreWritingAnswer,
} from "../app/writing/writing-engine.ts";

test("all writing challenges reference valid exercises and valid answer indices", () => {
  assert.ok(WRITING_CHALLENGES.length >= 30);
  for (const c of WRITING_CHALLENGES) {
    const ex = WRITING_EXERCISES[c.exerciseId];
    assert.ok(ex, `Missing exercise ${c.exerciseId} for challenge ${c.id}`);
    assert.equal(ex.task, c.task);
    if (c.kind === "order") {
      assert.equal(c.steps.length, 4);
    } else {
      assert.ok(c.choices.length >= 2);
      assert.ok(c.answer >= 0 && c.answer < c.choices.length);
    }
  }
});

test("buildWritingDeck respects mode filter and requested count", () => {
  const t1 = buildWritingDeck(WRITING_CHALLENGES, "task1", 6, () => 0.3);
  assert.equal(t1.length, 6);
  assert.ok(t1.every((c) => c.task === "task1"));

  const t2 = buildWritingDeck(WRITING_CHALLENGES, "task2", 10, () => 0.7);
  assert.equal(t2.length, 10);
  assert.ok(t2.every((c) => c.task === "task2"));

  const mixed = buildWritingDeck(WRITING_CHALLENGES, "mixed", 15, Math.random);
  assert.equal(mixed.length, 15);
  const ids = new Set(mixed.map((c) => c.id));
  assert.equal(ids.size, 15);
});

test("prepareChallenge keeps verify order fixed and guarantees shuffled order puzzles are not pre-solved", () => {
  const verify = WRITING_CHALLENGES.find((c) => c.kind === "verify");
  assert.ok(verify);
  const pv = prepareChallenge(verify, () => 0.99);
  assert.equal(pv.kind, "verify");
  assert.deepEqual(pv.displayChoices, verify.choices);
  assert.equal(pv.correctIndex, verify.answer);

  const order = WRITING_CHALLENGES.find((c) => c.kind === "order");
  assert.ok(order);
  // Even with a constant RNG that produces identity shuffle, prepareChallenge breaks the identity.
  const po = prepareChallenge(order, () => 0.99999);
  assert.equal(po.kind, "order");
  assert.equal(isOrderCorrect(po.shuffledIndices, order.steps.length), false);
});

test("scoreWritingAnswer awards combo multiplier, speed bonus, and resets on mistakes", () => {
  const fast = scoreWritingAnswer(true, 0, 5, false);
  assert.deepEqual(fast, { points: 150, nextCombo: 1, speedBonus: true });

  const slow = scoreWritingAnswer(true, 2, 12, false);
  assert.deepEqual(slow, { points: 300, nextCombo: 3, speedBonus: false });

  const orderFast = scoreWritingAnswer(true, 1, 14, true);
  assert.deepEqual(orderFast, { points: 410, nextCombo: 2, speedBonus: true });

  const wrong = scoreWritingAnswer(false, 4, 3, false);
  assert.deepEqual(wrong, { points: 0, nextCombo: 0, speedBonus: false });
});

test("estimateWritingBand maps accuracy and combo to 5.0–9.0 in 0.5 steps", () => {
  assert.equal(estimateWritingBand(0, 10, 0), "5.0");
  assert.equal(estimateWritingBand(5, 10, 2), "7.0");
  assert.equal(estimateWritingBand(10, 10, 10), "9.0");
  assert.equal(estimateWritingBand(10, 10, 3), "8.5");
});
