// Pure game logic for the falling-words typing game.
// Every random value arrives through actions, so the reducer stays deterministic.

export type Mode = "words" | "phrases";
export type Difficulty = "easy" | "normal" | "hard";
export type Status = "menu" | "playing" | "paused" | "over";
export type ItemKind = "normal" | "heart" | "boss";

export interface Entry {
  text: string;
  meaning?: string;
}

export interface FallingItem extends Entry {
  id: number;
  kind: ItemKind; // heart = +1 life when typed, boss = thrown by the boss
  x: number; // horizontal centre, percent of the lane width
  y: number; // 0 = top of the lane, 1 = ground
  speed: number; // lane heights per second
}

export interface Boss {
  index: number;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  word: Entry | null;
  attackEvery: number;
  attackIn: number;
  hitAt: number;
}

export interface Popup {
  id: number;
  x: number;
  y: number;
  label: string;
  meaning?: string;
  tone: "normal" | "heart" | "boss";
  born: number;
  ttl: number;
}

export interface Banner {
  text: string;
  sub?: string;
  tone: "map" | "boss" | "win";
  at: number;
}

export interface GameState {
  status: Status;
  mode: Mode;
  difficulty: Difficulty;
  pool: Entry[];
  items: FallingItem[];
  popups: Popup[];
  boss: Boss | null;
  banner: Banner | null;
  typed: string;
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  map: number;
  mapProgress: number;
  bossesDefeated: number;
  heartsCaught: number;
  continues: number;
  cleared: number;
  clearedChars: number;
  keystrokes: number;
  mistakes: number;
  elapsed: number;
  spawnIn: number;
  nextId: number;
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
  | { type: "continue" }
  | { type: "menu" };

export const LIVES = 5;
export const WORDS_PER_MAP = 10;
export const BOSS_EVERY = 5;
const BOSS_SHOT_SPEED = 1; // relative to a normal word on the same map
// Chance that a new word is a heart word, by lives left: the lower the health, the more hearts.
const HEART_CHANCE = [0, 0.2, 0.14, 0.09, 0.06, 0.04];
export const heartChance = (lives: number) => HEART_CHANCE[Math.max(0, Math.min(LIVES, lives))];
const MAX_ON_SCREEN = 8;
const PHRASE_SLOWDOWN = 1.35;
// The boss panel covers roughly x 38–62% and the top ~25% of the lane;
// its thrown words and score bubbles appear below it.
const BOSS_POPUP = { x: 50, y: 0.42 };
const SHOT_Y = 0.32;

// Indexes into the random numbers each tick receives.
const R = { pick: 0, repick: 1, x1: 2, x2: 3, x3: 4, speed: 5, heart: 6, bossWord: 7, shot1: 8, shot2: 9, shotX: 10 };
export const RANDS_PER_TICK = 11;

const BOSSES = [
  { name: "Quỷ Listening", emoji: "👹" },
  { name: "Bạch tuộc Reading", emoji: "🐙" },
  { name: "Rồng Writing Task 2", emoji: "🐉" },
  { name: "Robot chấm Speaking", emoji: "🤖" },
];

interface PoolGrowth {
  start: number; // how many of the most frequent entries are in play on map 1
  perMap: number; // how many rarer entries join on each later map
}

export const DIFFICULTIES: Record<
  Difficulty,
  {
    label: string;
    fallSeconds: number;
    spawnEvery: number;
    maxWordLength: number;
    maxPhraseLength: number;
    words: PoolGrowth;
    phrases: PoolGrowth;
  }
> = {
  easy: {
    label: "Dễ",
    fallSeconds: 13,
    spawnEvery: 2.6,
    maxWordLength: 7,
    maxPhraseLength: 12,
    words: { start: 800, perMap: 300 },
    phrases: { start: 100, perMap: 30 },
  },
  normal: {
    label: "Vừa",
    fallSeconds: 10,
    spawnEvery: 2.0,
    maxWordLength: 10,
    maxPhraseLength: 99,
    words: { start: 2500, perMap: 500 },
    phrases: { start: 180, perMap: 40 },
  },
  hard: {
    label: "Khó",
    fallSeconds: 7.5,
    spawnEvery: 1.5,
    maxWordLength: 14,
    maxPhraseLength: 99,
    words: { start: Infinity, perMap: 0 },
    phrases: { start: Infinity, perMap: 0 },
  },
};

/** Every entry the run can use, most frequent first (the source lists are frequency-ordered). */
export function buildPool(mode: Mode, difficulty: Difficulty, words: Entry[], phrases: Entry[]): Entry[] {
  const d = DIFFICULTIES[difficulty];
  if (mode === "words") return words.filter((w) => w.text.length <= d.maxWordLength);
  return phrases.filter((p) => p.text.length <= d.maxPhraseLength);
}

/** How many of the pool's entries are in play on a map: common words first, rarer ones join map by map. */
export function activePoolSize(mode: Mode, difficulty: Difficulty, poolLength: number, map: number) {
  const growth = DIFFICULTIES[difficulty][mode];
  return Math.min(poolLength, growth.start + (map - 1) * growth.perMap);
}

const activePool = (state: GameState) =>
  state.pool.slice(0, activePoolSize(state.mode, state.difficulty, state.pool.length, state.map));

export const isBossMap = (map: number) => map % BOSS_EVERY === 0;

const speedFactor = (map: number) => 1 + (map - 1) * 0.1;
const spawnFactor = (map: number) => Math.max(0.45, 1 - (map - 1) * 0.06);

function fallSeconds(state: GameState) {
  return DIFFICULTIES[state.difficulty].fallSeconds * (state.mode === "phrases" ? PHRASE_SLOWDOWN : 1);
}

function spawnInterval(state: GameState) {
  const d = DIFFICULTIES[state.difficulty];
  const slow = state.mode === "phrases" ? PHRASE_SLOWDOWN : 1;
  return d.spawnEvery * slow * spawnFactor(state.map);
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
    boss: null,
    banner: null,
    typed: "",
    score: 0,
    lives: LIVES,
    combo: 0,
    maxCombo: 0,
    map: 1,
    mapProgress: 0,
    bossesDefeated: 0,
    heartsCaught: 0,
    continues: 0,
    cleared: 0,
    clearedChars: 0,
    keystrokes: 0,
    mistakes: 0,
    elapsed: 0,
    spawnIn: 0.8,
    nextId: 1,
    errorTick: 0,
    missed: [],
    bestAtStart: 0,
  };
}

// --- Targeting: falling items and the boss's word share one list of candidates ---

export interface Candidate {
  text: string;
  y: number;
  item?: FallingItem; // undefined means the boss word
}

function candidates(state: GameState): Candidate[] {
  const list: Candidate[] = state.items.map((item) => ({ text: item.text, y: item.y, item }));
  // The boss sits at the top, so falling words that share a prefix are targeted first.
  if (state.boss?.word) list.push({ text: state.boss.word.text, y: -1 });
  return list;
}

/** What the player is currently typing: the lowest candidate whose text starts with the input. */
export function targetOf(state: GameState): Candidate | undefined {
  if (!state.typed) return undefined;
  let target: Candidate | undefined;
  for (const c of candidates(state)) {
    if (c.text.startsWith(state.typed) && (!target || c.y > target.y)) target = c;
  }
  return target;
}

function lowestExact(list: Candidate[], text: string) {
  let best: Candidate | undefined;
  for (const c of list) {
    if (c.text === text && (!best || c.y > best.y)) best = c;
  }
  return best;
}

/** An exact match that waits for Enter because a longer candidate shares the same start. */
export function pendingExact(state: GameState): Candidate | undefined {
  const list = candidates(state);
  const exact = lowestExact(list, state.typed);
  if (!exact) return undefined;
  return list.some((c) => c.text.length > state.typed.length && c.text.startsWith(state.typed)) ? exact : undefined;
}

// --- Scoring and progression ---

function pointsFor(state: GameState, text: string, perLetter: number) {
  return Math.round(text.replace(/ /g, "").length * perLetter * (1 + Math.min(state.combo, 20) * 0.1));
}

function advanceMap(state: GameState, banner?: Banner): GameState {
  const map = state.map + 1;
  return {
    ...state,
    map,
    mapProgress: 0,
    banner:
      banner ??
      (isBossMap(map)
        ? { text: `Map ${map}`, sub: "BOSS xuất hiện!", tone: "boss", at: state.elapsed }
        : { text: `Map ${map}`, tone: "map", at: state.elapsed }),
  };
}

function afterWord(state: GameState, text: string): GameState {
  const combo = state.combo + 1;
  return {
    ...state,
    typed: "",
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    cleared: state.cleared + 1,
    clearedChars: state.clearedChars + text.length + 1,
  };
}

function popup(
  state: GameState,
  x: number,
  y: number,
  label: string,
  meaning?: string,
  tone: Popup["tone"] = "normal",
): GameState {
  return {
    ...state,
    popups: [
      ...state.popups,
      { id: state.nextId, x, y, label, meaning, tone, born: state.elapsed, ttl: meaning || tone !== "normal" ? 2.4 : 1.1 },
    ],
    nextId: state.nextId + 1,
  };
}

function clearItem(state: GameState, item: FallingItem): GameState {
  let points = pointsFor(state, item.text, 10);
  let label = `+${points}`;
  let lives = state.lives;
  let heartsCaught = state.heartsCaught;
  if (item.kind === "heart") {
    heartsCaught += 1;
    if (lives < LIVES) {
      lives += 1;
      label = `+1 mạng · +${points}`;
    } else {
      points += 50;
      label = `Đầy mạng · +${points}`;
    }
  }

  let next: GameState = {
    ...state,
    items: state.items.filter((i) => i.id !== item.id),
    score: state.score + points,
    lives,
    heartsCaught,
  };
  next = popup(next, item.x, item.y, label, item.meaning, item.kind === "heart" ? "heart" : "normal");
  next = afterWord(next, item.text);

  // Normal maps advance after WORDS_PER_MAP words; boss maps only end when the boss falls.
  if (!isBossMap(next.map)) {
    next = { ...next, mapProgress: next.mapProgress + 1 };
    if (next.mapProgress >= WORDS_PER_MAP) next = advanceMap(next);
  }
  return next;
}

function hitBoss(state: GameState): GameState {
  const boss = state.boss!;
  const word = boss.word!;
  const points = pointsFor(state, word.text, 15);
  let next: GameState = {
    ...state,
    score: state.score + points,
    boss: { ...boss, hp: boss.hp - 1, word: null, hitAt: state.elapsed },
  };
  next = popup(next, BOSS_POPUP.x, BOSS_POPUP.y, `💥 +${points}`, word.meaning, "boss");
  next = afterWord(next, word.text);

  if (next.boss!.hp > 0) return next;
  const bonus = 300 * (boss.index + 1);
  next = {
    ...next,
    boss: null,
    score: next.score + bonus,
    lives: Math.min(LIVES, next.lives + 1),
    bossesDefeated: next.bossesDefeated + 1,
  };
  return advanceMap(next, {
    text: `Đã hạ ${boss.name}!`,
    sub: `+${bonus} điểm · +1 ♥ · Map ${next.map + 1}`,
    tone: "win",
    at: next.elapsed,
  });
}

function clearCandidate(state: GameState, c: Candidate): GameState {
  return c.item ? clearItem(state, c.item) : hitBoss(state);
}

function mistake(state: GameState): GameState {
  return { ...state, keystrokes: state.keystrokes + 1, mistakes: state.mistakes + 1, errorTick: state.errorTick + 1 };
}

// --- Spawning ---

function pick(list: Entry[], r: number) {
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

function spawn(state: GameState, rand: number[]): GameState {
  const pool = activePool(state);
  if (pool.length === 0) return state;
  let entry = pick(pool, rand[R.pick]);
  if (state.items.some((i) => i.text === entry.text) && pool.length > 1) {
    entry = pool[(pool.indexOf(entry) + 1 + Math.floor(rand[R.repick] * (pool.length - 1))) % pool.length];
  }

  const [lo, hi] = state.mode === "phrases" ? [20, 80] : [12, 88];
  const recent = state.items.filter((i) => i.y < 0.25);
  const candidatesX = [rand[R.x1], rand[R.x2], rand[R.x3]].map((r) => lo + r * (hi - lo));
  let x = candidatesX[0];
  let bestGap = -1;
  for (const c of candidatesX) {
    // Keep clear of words that just spawned.
    const gap = recent.length ? Math.min(...recent.map((i) => Math.abs(i.x - c))) : Infinity;
    if (gap > bestGap) {
      bestGap = gap;
      x = c;
    }
  }

  const kind: ItemKind =
    rand[R.heart] < heartChance(state.lives) && !state.items.some((i) => i.kind === "heart") ? "heart" : "normal";
  const speed = (speedFactor(state.map) / fallSeconds(state)) * (0.9 + rand[R.speed] * 0.2);
  const item: FallingItem = { ...entry, id: state.nextId, kind, x, y: 0, speed };
  return { ...state, items: [...state.items, item], nextId: state.nextId + 1 };
}

function bossWord(state: GameState, r: number): Entry {
  const minLength = state.mode === "words" ? 7 : 10;
  const pool = activePool(state);
  const long = pool.filter((e) => e.text.length >= minLength);
  return pick(long.length ? long : pool, r);
}

function summonBoss(state: GameState, rand: number[]): GameState {
  const index = state.map / BOSS_EVERY - 1;
  const template = BOSSES[index % BOSSES.length];
  const maxHp = Math.min(8, 3 + index);
  return {
    ...state,
    boss: {
      ...template,
      index,
      hp: maxHp,
      maxHp,
      word: bossWord(state, rand[R.bossWord]),
      attackEvery: Math.max(4, 7 - index * 0.5),
      attackIn: 4,
      hitAt: -10,
    },
  };
}

function bossAttack(state: GameState, rand: number[]): GameState {
  const pool = activePool(state);
  const short = pool.filter((e) => e.text.length <= (state.mode === "words" ? 6 : 10));
  const source = short.length ? short : pool;
  const speed = (speedFactor(state.map) / fallSeconds(state)) * BOSS_SHOT_SPEED;
  const shots: FallingItem[] = [rand[R.shot1], rand[R.shot2]].map((r, i) => ({
    ...pick(source, r),
    id: state.nextId + i,
    kind: "boss",
    x: i === 0 ? 30 + rand[R.shotX] * 8 : 62 + rand[R.shotX] * 8,
    y: SHOT_Y,
    speed,
  }));
  return { ...state, items: [...state.items, ...shots], nextId: state.nextId + shots.length };
}

// --- Actions ---

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
    banner: state.banner && elapsed - state.banner.at < 2.2 ? state.banner : null,
    spawnIn: state.spawnIn - dt,
  };

  // Heart words that land are simply lost; every other word costs a life.
  const hurt = landed.filter((i) => i.kind !== "heart");
  if (hurt.length) {
    const missed = [...next.missed];
    for (const item of hurt) {
      if (!missed.some((m) => m.text === item.text)) missed.push({ text: item.text, meaning: item.meaning });
    }
    next = { ...next, lives: Math.max(0, next.lives - hurt.length), combo: 0, missed };
    if (next.lives === 0) return { ...next, status: "over" };
  }
  if (landed.length && next.typed && !candidates(next).some((c) => c.text.startsWith(next.typed))) {
    next = { ...next, typed: "" };
  }

  if (isBossMap(next.map) && !next.boss) next = summonBoss(next, rand);
  if (next.boss) {
    let boss = { ...next.boss, attackIn: next.boss.attackIn - dt };
    if (!boss.word) boss = { ...boss, word: bossWord(next, rand[R.bossWord]) };
    next = { ...next, boss };
    if (boss.attackIn <= 0) {
      next = bossAttack(next, rand);
      next = { ...next, boss: { ...boss, attackIn: boss.attackEvery } };
    }
  }

  // Regular words stop falling during a boss fight; only the boss throws words.
  if (next.boss) return next;
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
    const word = normalize(raw.replace(/\s+/g, ""));
    const exact = lowestExact(candidates(state), word);
    if (exact) return clearCandidate(state, exact);
    return word ? mistake(state) : state;
  }
  const value = normalize(raw);
  if (value === state.typed) return state;

  const grew = value.length > state.typed.length;
  const list = candidates(state);
  if (grew && !list.some((c) => c.text.startsWith(value))) return mistake(state);

  const next: GameState = grew ? { ...state, keystrokes: state.keystrokes + 1, typed: value } : { ...state, typed: value };
  const exact = lowestExact(list, value);
  if (exact && !pendingExact(next)) return clearCandidate(next, exact);
  return next;
}

function submit(state: GameState): GameState {
  const text = state.typed.trim();
  if (!text) return state;
  const exact = lowestExact(candidates(state), text);
  return exact ? clearCandidate(state, exact) : mistake(state);
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
        banner: { text: "Map 1", tone: "map", at: 0 },
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
    case "continue":
      // Revive after losing: full lives, same map and score. Words close to the ground are
      // cleared so the player is not knocked out again straight away.
      return state.status === "over"
        ? {
            ...state,
            status: "playing",
            lives: LIVES,
            combo: 0,
            typed: "",
            items: state.items.filter((i) => i.y < 0.5),
            continues: state.continues + 1,
            banner: { text: "Hồi sinh!", sub: "Đầy máu, chơi tiếp nào", tone: "win", at: state.elapsed },
          }
        : state;
    case "menu":
      return initialState(state.mode, state.difficulty);
  }
}

export function stats(state: GameState) {
  const minutes = state.elapsed / 60;
  return {
    wpm: minutes > 0 ? Math.round(state.clearedChars / 5 / minutes) : 0,
    accuracy: state.keystrokes > 0 ? Math.round(((state.keystrokes - state.mistakes) / state.keystrokes) * 100) : 100,
  };
}
