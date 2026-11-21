// Pure tests for Custom Word Deck parser and URL encoder/decoder. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CUSTOM_DECK_WORDS,
  SAMPLE_DECKS,
  decodeDeck,
  encodeDeck,
  formatDeckText,
  parseDeckText,
} from "../src/lib/custom-deck.ts";

test("parseDeckText handles multiple separators, numbered lists, deduplication, and invalid lines", () => {
  const raw = [
    "1. Mitigate - giảm thiểu tác động",
    "2) Ubiquitous: có mặt ở khắp nơi",
    "sustainable\tbền vững",
    "resilient | kiên cường",
    "mitigate - bản trùng sẽ bỏ qua",
    "alleviate",
    "### không hợp lệ 123",
    "a - quá ngắn",
  ].join("\n");

  const { entries, skipped } = parseDeckText(raw);
  assert.equal(entries.length, 5);
  assert.equal(skipped, 2);
  assert.deepEqual(entries[0], { text: "mitigate", meaning: "giảm thiểu tác động" });
  assert.deepEqual(entries[1], { text: "ubiquitous", meaning: "có mặt ở khắp nơi" });
  assert.deepEqual(entries[2], { text: "sustainable", meaning: "bền vững" });
  assert.deepEqual(entries[3], { text: "resilient", meaning: "kiên cường" });
  assert.deepEqual(entries[4], { text: "alleviate", meaning: "" });
});

test("encodeDeck and decodeDeck round-trip Vietnamese meanings cleanly", () => {
  const deck = SAMPLE_DECKS[0];
  const token = encodeDeck(deck);
  assert.ok(/^[A-Za-z0-9_-]+$/.test(token), "Encoded token must be URL-safe");

  const decoded = decodeDeck(token);
  assert.deepEqual(decoded, deck);
});

test("decodeDeck rejects malformed tokens and parseDeckText respects max size", () => {
  assert.equal(decodeDeck(""), null);
  assert.equal(decodeDeck("not-valid-json!!!"), null);

  const manyLines = Array.from({ length: 120 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))} - nghĩa ${i}`).join("\n");
  const { entries } = parseDeckText(manyLines);
  assert.equal(entries.length, MAX_CUSTOM_DECK_WORDS);

  const formatted = formatDeckText(SAMPLE_DECKS[1].entries);
  assert.equal(parseDeckText(formatted).entries.length, SAMPLE_DECKS[1].entries.length);
});
