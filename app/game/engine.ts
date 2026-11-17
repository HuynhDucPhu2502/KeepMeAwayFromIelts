// Pure game logic for the falling-words typing game.
// Every random value arrives through actions, so the reducer stays deterministic.

export type Mode = "words" | "phrases";
export type Difficulty = "easy" | "normal" | "hard";
export type Status = "menu" | "playing" | "paused" | "over";

export interface Entry {
  text: string;
  meaning?: string;
}

export interface FallingItem extends Entry {
  id: number;
  x: number; // horizontal centre, percent of the field width
  y: number; // 0 = top of the field, 1 = ground
  speed: number; // field heights per second
}

export interface Popup {
  id: number;
  x: number;
  y: number;
  label: string;
  meaning?: string;
  born: number;
  ttl: number;
}

export interface GameState {
  status: Status;
  mode: Mode;
  difficulty: Difficulty;
  pool: Entry[];
  items: FallingItem[];
  popups: Popup[];
  typed: string;
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  cleared: number;
  clearedChars: number;
  keystrokes: number;
  mistakes: number;
  elapsed: number;
  spawnIn: number;
  nextId: number;
  levelUpAt: number;
  errorTick: number;
  missed: Entry[];
  bestAtStart: number;
}

export type Action =
  | { type: "setMode"; mode: Mode }
  | { type: "setDifficulty"; difficulty: Difficulty }
  | { type: "start"; pool: Entry[]; best: number }
  | { type: "tick"; dt: number; rand: number[] }
  | { type: "input"; value: string }
  | { type: "submit" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "menu" };

export const LIVES = 5;
export const WORDS_PER_LEVEL = 10;
const MAX_ON_SCREEN = 8;
const PHRASE_SLOWDOWN = 1.35;
export const RANDS_PER_TICK = 6;

export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; fallSeconds: number; spawnEvery: number; wordPool: number; maxWordLength: number; maxPhraseLength: number }
> = {
  easy: { label: "Dễ", fallSeconds: 13, spawnEvery: 2.6, wordPool: 800, maxWordLength: 7, maxPhraseLength: 12 },
  normal: { label: "Vừa", fallSeconds: 10, spawnEvery: 2.0, wordPool: 2500, maxWordLength: 10, maxPhraseLength: 99 },
  hard: { label: "Khó", fallSeconds: 7.5, spawnEvery: 1.5, wordPool: Infinity, maxWordLength: 14, maxPhraseLength: 99 },
};

export function buildPool(mode: Mode, difficulty: Difficulty, words: string[], phrases: Entry[]): Entry[] {
  const d = DIFFICULTIES[difficulty];
  if (mode === "words") {
    return words
      .slice(0, d.wordPool)
      .filter((w) => w.length <= d.maxWordLength)
      .map((text) => ({ text }));
  }
  return phrases.filter((p) => p.text.length <= d.maxPhraseLength);
}

export function levelFor(cleared: number) {
  return 1 + Math.floor(cleared / WORDS_PER_LEVEL);
}

function speedFactor(level: number) {
  return 1 + (level - 1) * 0.12;
}

function spawnFactor(level: number) {
  return Math.max(0.45, 1 - (level - 1) * 0.07);
}

function spawnInterval(state: GameState) {
  const d = DIFFICULTIES[state.difficulty];
  const slow = state.mode === "phrases" ? PHRASE_SLOWDOWN : 1;
  return d.spawnEvery * slow * spawnFactor(levelFor(state.cleared));
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^ /, "");
}

export function initialState(mode: Mode = "words", difficulty: Difficulty = "normal"): GameState {
  return {
    status: "menu",
    mode,
    difficulty,
    pool: [],
    items: [],
    popups: [],
    typed: "",
    score: 0,
    lives: LIVES,
    combo: 0,
    maxCombo: 0,
    cleared: 0,
    clearedChars: 0,
    keystrokes: 0,
    mistakes: 0,
    elapsed: 0,
    spawnIn: 0.4,
    nextId: 1,
    levelUpAt: -10,
    errorTick: 0,
    missed: [],
    bestAtStart: 0,
  };
}

/** The item the player is currently typing: the lowest one whose text starts with the input. */
export function targetOf(items: FallingItem[], typed: string): FallingItem | undefined {
  if (!typed) return undefined;
  let target: FallingItem | undefined;
  for (const item of items) {
    if (item.text.startsWith(typed) && (!target || item.y > target.y)) target = item;
  }
  return target;
}

/** An exact match that is waiting for Enter because a longer item shares the same start. */
export function pendingExact(items: FallingItem[], typed: string): FallingItem | undefined {
  const exact = lowestExact(items, typed);
  if (!exact) return undefined;
  return items.some((i) => i.text.length > typed.length && i.text.startsWith(typed)) ? exact : undefined;
}

function lowestExact(items: FallingItem[], text: string) {
  let best: FallingItem | undefined;
  for (const item of items) {
    if (item.text === text && (!best || item.y > best.y)) best = item;
  }
  return best;
}

function clearItem(state: GameState, item: FallingItem): GameState {
  const letters = item.text.replace(/ /g, "").length;
  const points = Math.round(letters * 10 * (1 + Math.min(state.combo, 20) * 0.1));
  const cleared = state.cleared + 1;
  const combo = state.combo + 1;
  const leveledUp = levelFor(cleared) > levelFor(state.cleared);
  return {
    ...state,
    items: state.items.filter((i) => i.id !== item.id),
    popups: [
      ...state.popups,
      {
        id: state.nextId,
        x: item.x,
        y: item.y,
        label: `+${points}`,
        meaning: item.meaning,
        born: state.elapsed,
        ttl: item.meaning ? 2.4 : 1.1,
      },
    ],
    nextId: state.nextId + 1,
    typed: "",
    score: state.score + points,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    cleared,
    clearedChars: state.clearedChars + item.text.length + 1,
    levelUpAt: leveledUp ? state.elapsed : state.levelUpAt,
  };
}

function mistake(state: GameState): GameState {
  return { ...state, keystrokes: state.keystrokes + 1, mistakes: state.mistakes + 1, errorTick: state.errorTick + 1 };
}

function spawn(state: GameState, rand: number[]): GameState {
  const { pool } = state;
  if (pool.length === 0) return state;
  let entry = pool[Math.floor(rand[0] * pool.length)];
  if (state.items.some((i) => i.text === entry.text) && pool.length > 1) {
    entry = pool[(pool.indexOf(entry) + 1 + Math.floor(rand[1] * (pool.length - 1))) % pool.length];
  }

  const [lo, hi] = state.mode === "phrases" ? [20, 80] : [12, 88];
  const recent = state.items.filter((i) => i.y < 0.25);
  const candidates = [rand[2], rand[3], rand[4]].map((r) => lo + r * (hi - lo));
  let x = candidates[0];
  let bestGap = -1;
  for (const c of candidates) {
    const gap = recent.length ? Math.min(...recent.map((i) => Math.abs(i.x - c))) : Infinity;
    if (gap > bestGap) {
      bestGap = gap;
      x = c;
    }
  }

  const d = DIFFICULTIES[state.difficulty];
  const fall = d.fallSeconds * (state.mode === "phrases" ? PHRASE_SLOWDOWN : 1);
  const speed = (speedFactor(levelFor(state.cleared)) / fall) * (0.9 + rand[5] * 0.2);
  const item: FallingItem = { ...entry, id: state.nextId, x, y: 0, speed };
  return { ...state, items: [...state.items, item], nextId: state.nextId + 1 };
}

function tick(state: GameState, dt: number, rand: number[]): GameState {
  const elapsed = state.elapsed + dt;
  const moved = state.items.map((i) => ({ ...i, y: i.y + i.speed * dt }));
  const landed = moved.filter((i) => i.y >= 1);
  const items = moved.filter((i) => i.y < 1);

  let next: GameState = {
    ...state,
    elapsed,
    items,
    popups: state.popups.filter((p) => elapsed - p.born < p.ttl),
    spawnIn: state.spawnIn - dt,
  };

  if (landed.length) {
    const missed = [...next.missed];
    for (const item of landed) {
      if (!missed.some((m) => m.text === item.text)) missed.push({ text: item.text, meaning: item.meaning });
    }
    next = { ...next, lives: Math.max(0, next.lives - landed.length), combo: 0, missed };
    if (next.typed && !items.some((i) => i.text.startsWith(next.typed))) next = { ...next, typed: "" };
    if (next.lives === 0) return { ...next, status: "over" };
  }

  if (next.items.length === 0 && next.spawnIn > 0.6) next = { ...next, spawnIn: 0.6 };
  if (next.spawnIn <= 0) {
    if (next.items.length < MAX_ON_SCREEN) {
      next = spawn(next, rand);
      next = { ...next, spawnIn: spawnInterval(next) };
    } else {
      next = { ...next, spawnIn: 0.3 };
    }
  }
  return next;
}

function input(state: GameState, raw: string): GameState {
  // In word mode a space confirms the word, since words never contain spaces.
  if (state.mode === "words" && /\s/.test(raw)) {
    return submit({ ...state, typed: normalize(raw.replace(/\s+/g, "")) });
  }
  const value = normalize(raw);
  if (value === state.typed) return state;

  const grew = value.length > state.typed.length;
  const matches = state.items.filter((i) => i.text.startsWith(value));
  if (grew && matches.length === 0) return mistake(state);

  let next: GameState = grew ? { ...state, keystrokes: state.keystrokes + 1, typed: value } : { ...state, typed: value };
  const exact = lowestExact(next.items, value);
  if (exact && !pendingExact(next.items, value)) next = clearItem(next, exact);
  return next;
}

function submit(state: GameState): GameState {
  const text = state.typed.trim();
  if (!text) return state;
  const exact = lowestExact(state.items, text);
  if (exact) return clearItem(state, exact);
  return { ...state, mistakes: state.mistakes + 1, errorTick: state.errorTick + 1 };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "setMode":
      return state.status === "menu" || state.status === "over" ? { ...state, mode: action.mode } : state;
    case "setDifficulty":
      return state.status === "menu" || state.status === "over" ? { ...state, difficulty: action.difficulty } : state;
    case "start":
      return {
        ...initialState(state.mode, state.difficulty),
        status: "playing",
        pool: action.pool,
        bestAtStart: action.best,
      };
    case "tick":
      return state.status === "playing" ? tick(state, action.dt, action.rand) : state;
    case "input":
      return state.status === "playing" ? input(state, action.value) : state;
    case "submit":
      return state.status === "playing" ? submit(state) : state;
    case "pause":
      return state.status === "playing" ? { ...state, status: "paused" } : state;
    case "resume":
      return state.status === "paused" ? { ...state, status: "playing" } : state;
    case "menu":
      return initialState(state.mode, state.difficulty);
  }
}

export function stats(state: GameState) {
  const minutes = state.elapsed / 60;
  return {
    level: levelFor(state.cleared),
    wpm: minutes > 0 ? Math.round(state.clearedChars / 5 / minutes) : 0,
    accuracy: state.keystrokes > 0 ? Math.round(((state.keystrokes - state.mistakes) / state.keystrokes) * 100) : 100,
  };
}
