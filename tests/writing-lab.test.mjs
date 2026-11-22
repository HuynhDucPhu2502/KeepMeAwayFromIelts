import assert from "node:assert/strict";
import test from "node:test";
import { LAB_CHALLENGES } from "../src/lib/writing-lab/lab-data.ts";
import {
  buildLabDeck,
  buildUpgradeHint,
  estimateLabBand,
  isBuildCorrect,
  isUpgradeMatch,
  normalizeLabAnswer,
  prepareLabChallenge,
  scoreLabAnswer,
} from "../src/lib/writing-lab/lab-engine.ts";

test("all writing-lab challenges are well-formed and balanced across 3 modes", () => {
  const counts = { upgrade: 0, error: 0, build: 0 };
  const ids = new Set();
  for (const ch of LAB_CHALLENGES) {
    assert.ok(!ids.has(ch.id), `duplicate id ${ch.id}`);
    ids.add(ch.id);
    counts[ch.kind]++;
    if (ch.kind === "upgrade") {
      assert.ok(ch.targetSentence.includes("___"), `${ch.id} missing blank`);
      assert.ok(ch.accepted.includes(ch.canonical), `${ch.id} canonical must be in accepted`);
    } else if (ch.kind === "error") {
      assert.ok(ch.errorIndex >= 0 && ch.errorIndex < ch.segments.length, `${ch.id} invalid errorIndex`);
      assert.ok(ch.correctFix >= 0 && ch.correctFix < ch.fixes.length, `${ch.id} invalid correctFix`);
    } else {
      assert.ok(ch.tiles.length >= 4, `${ch.id} needs >= 4 tiles`);
    }
  }
  assert.ok(counts.upgrade >= 8 && counts.error >= 8 && counts.build >= 8);
});

test("isUpgradeMatch accepts punctuation/case variants and synonyms", () => {
  assert.equal(normalizeLabAnswer("  Rose   Sharply! "), "rose sharply");
  assert.equal(isUpgradeMatch("Air Pollution.", ["air pollution", "atmospheric pollution"]), true);
  assert.equal(isUpgradeMatch("SURGED", ["rose sharply", "surged"]), true);
  assert.equal(isUpgradeMatch("went up fast", ["rose sharply", "surged"]), false);
  assert.equal(buildUpgradeHint("air pollution"), "a__ p_____");
});

test("buildLabDeck filters by mode, avoids duplicates, and shuffles build tiles", () => {
  const deck = buildLabDeck(LAB_CHALLENGES, "build", 6, () => 0.42);
  assert.equal(deck.length, 6);
  assert.ok(deck.every((c) => c.kind === "build"));
  for (const item of deck) {
    if (item.kind === "build") {
      assert.equal(item.shuffledOrder.length, item.tiles.length);
      assert.equal(isBuildCorrect(item.shuffledOrder, item.tiles.length), false);
    }
  }
  const errPrep = prepareLabChallenge(LAB_CHALLENGES.find((c) => c.kind === "error"), () => 0.3);
  assert.equal(errPrep.kind, "error");
  assert.ok(errPrep.correctDisplayFix >= 0 && errPrep.correctDisplayFix < errPrep.displayFixes.length);
});

test("scoreLabAnswer and estimateLabBand behave consistently", () => {
  const first = scoreLabAnswer(true, 0, false);
  assert.deepEqual(first, { points: 120, nextCombo: 1 });
  const hinted = scoreLabAnswer(true, 1, true);
  assert.deepEqual(hinted, { points: 95, nextCombo: 2 });
  assert.deepEqual(scoreLabAnswer(false, 4, false), { points: 0, nextCombo: 0 });
  assert.equal(estimateLabBand(10, 10, 10), "9.0");
  assert.equal(estimateLabBand(0, 10, 0), "5.0");
});
