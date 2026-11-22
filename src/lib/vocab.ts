import type { Entry } from "./typing-engine";

export interface VocabData {
  words: Entry[];
  phrases: Entry[];
}

let wordsPromise: Promise<Entry[]> | null = null;
let vocabPromise: Promise<VocabData> | null = null;

/** Lazily loads the 5,785-word IELTS list (310 KB JSON) only when a game starts. */
export function loadWords(): Promise<Entry[]> {
  if (!wordsPromise) {
    wordsPromise = import("@/data/words.json").then((m) => m.default as Entry[]);
  }
  return wordsPromise;
}

/** Lazily loads both IELTS words and Reading/Listening phrases on demand. */
export function loadVocab(): Promise<VocabData> {
  if (!vocabPromise) {
    vocabPromise = Promise.all([
      loadWords(),
      import("@/data/phrases.json").then((m) => m.default as Entry[]),
    ]).then(([words, phrases]) => ({ words, phrases }));
  }
  return vocabPromise;
}
