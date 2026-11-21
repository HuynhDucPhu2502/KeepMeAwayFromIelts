// Pure tests for Speaking Part 2 speech transcript keyword detection. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSpeakingWpm,
  countFillers,
  countSpokenWords,
  detectSpokenKeywords,
} from "../src/lib/speaking/speech-match.ts";

test("detectSpokenKeywords catches exact phrases and inflected verb/noun forms", () => {
  const keywords = [
    "broaden my horizons",
    "step out of my comfort zone",
    "eye-opening",
    "life-changing",
  ];

  const transcript =
    "Honestly, travelling solo really broadened my horizons and forced me to step out of my comfort zone. It was such an eye opening experience!";

  const hit = detectSpokenKeywords(transcript, keywords);
  assert.deepEqual(hit, [
    "broaden my horizons",
    "step out of my comfort zone",
    "eye-opening",
  ]);
});

test("detectSpokenKeywords ignores unmatched keywords and handles empty input", () => {
  assert.deepEqual(detectSpokenKeywords("", ["sustainable", "innovative"]), []);
  assert.deepEqual(detectSpokenKeywords("I went to the park yesterday", ["sustainable", "innovative"]), []);
});

test("countSpokenWords, computeSpeakingWpm, and countFillers work accurately", () => {
  const sample = "Um, well I think that, uh, learning English really helps me, you know, connect with people.";
  assert.equal(countSpokenWords(sample), 16);
  assert.equal(countFillers(sample), 3);
  assert.equal(computeSpeakingWpm(60, 30), 120);
  assert.equal(computeSpeakingWpm(5, 1), 0);
});
