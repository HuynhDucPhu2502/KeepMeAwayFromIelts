// Pure party-room rules shared by the player and host pages (no Firebase here, so Node tests can load it).
import type { Difficulty, Mode } from "../game/engine";

export type RoomStatus = "lobby" | "playing" | "ended";

export const LAST_SURVIVOR_DURATION = 0 as const;
export const ROUND_MINUTES = [3, 5, 7, 10, 15, 30, LAST_SURVIVOR_DURATION] as const;
export type RoundMinutes = (typeof ROUND_MINUTES)[number];
export const DEFAULT_ROUND_MINUTES: RoundMinutes = 3;

export interface RoomSettings {
  mode: Mode;
  difficulty: Difficulty;
  durationMin: RoundMinutes;
}

export interface PlayerState {
  name: string;
  joinedAt: number; // server ms
  connected: boolean;
  disconnectedAt: number | null; // server ms when `connected` went false
  round: number; // the round this player is in; participants have round === room.round
  alive: boolean;
  score: number;
  lives: number;
  map: number;
  cleared: number;
  accuracy: number;
  wpm: number;
  eliminatedAt: number | null; // server ms
  missed: string[];
}

export interface BandCard {
  uid: string;
  band: string;
  comment: string;
}

export interface RoundResults {
  ranking: string[];
  cards: BandCard[];
  fallback: boolean;
}

export interface Room {
  hostUid: string;
  createdAt: number;
  round: number;
  status: RoomStatus;
  settings: RoomSettings;
  seed: number;
  startAt: number; // server ms
  endsAt: number; // server ms
  players: Record<string, PlayerState>;
  results?: RoundResults;
}

export const ROUND_MS = DEFAULT_ROUND_MINUTES * 60_000;
export const COUNTDOWN_MS = 5_000;
export const MAX_PLAYERS = 30;
export const MAX_NAME = 16;
export const DISCONNECT_GRACE_MS = 10_000;
const LIVES = 5; // same as the engine's LIVES (kept local so this module has no runtime imports)

export function normalizeDurationMin(value: unknown): RoundMinutes {
  return typeof value === "number" && (ROUND_MINUTES as readonly number[]).includes(value)
    ? (value as RoundMinutes)
    : DEFAULT_ROUND_MINUTES;
}

export function roundDurationMs(durationMin: RoundMinutes): number {
  return durationMin * 60_000;
}

export const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // A–Z without I and O
const ROOM_CODE_RE = /^[A-HJ-NP-Z]{4}$/;

export function makeRoomCode(rand: () => number): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ROOM_ALPHABET[Math.min(ROOM_ALPHABET.length - 1, Math.floor(rand() * ROOM_ALPHABET.length))];
  }
  return code;
}

export function isRoomCode(value: unknown): value is string {
  return typeof value === "string" && ROOM_CODE_RE.test(value);
}

export function addRoomCode(codes: readonly string[], code: string): string[] {
  if (!isRoomCode(code)) return [...codes];
  return codes.includes(code) ? [...codes] : [...codes, code];
}

export function removeRoomCode(codes: readonly string[], code: string): string[] {
  return codes.filter((c) => c !== code);
}

export function parseRoomCodes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of parsed) {
      if (isRoomCode(item) && !seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME).trim();
}

/** What a player writes for themselves when a new round starts. */
export function freshRoundState(round: number) {
  return {
    round,
    alive: true,
    score: 0,
    lives: LIVES,
    map: 1,
    cleared: 0,
    accuracy: 100,
    wpm: 0,
    eliminatedAt: null,
    missed: [] as string[],
    connected: true,
    disconnectedAt: null,
  } satisfies Partial<PlayerState>;
}

/** Out of the round: eliminated, or a phone that has been disconnected for more than the grace period. */
export function isOut(p: PlayerState, now: number): boolean {
  if (!p.alive) return true;
  return p.connected === false && now - (p.disconnectedAt ?? -Infinity) > DISCONNECT_GRACE_MS;
}

function outAt(p: PlayerState): number {
  if (p.eliminatedAt != null) return p.eliminatedAt;
  return (p.disconnectedAt ?? 0) + DISCONNECT_GRACE_MS;
}

export function participants(room: Room): [string, PlayerState][] {
  return Object.entries(room.players).filter(([, p]) => p.round === room.round);
}

/** Participants, best first: still in, then higher score, then eliminated later. */
export function rankPlayers(room: Room, now: number): string[] {
  return participants(room)
    .map(([uid, p]) => ({ uid, p, out: isOut(p, now) }))
    .sort((a, b) => {
      if (a.out !== b.out) return a.out ? 1 : -1;
      if (a.p.score !== b.p.score) return b.p.score - a.p.score;
      if (a.out) return outAt(b.p) - outAt(a.p);
      return 0;
    })
    .map((x) => x.uid);
}

export function aliveCount(room: Room, now: number): number {
  return participants(room).filter(([, p]) => !isOut(p, now)).length;
}

export function shouldEnd(room: Room, now: number): boolean {
  if (room.status !== "playing" || now < room.startAt) return false;
  if (room.endsAt > 0 && now >= room.endsAt) return true;
  const total = participants(room).length;
  const alive = aliveCount(room, now);
  if (alive === 0) return true;
  return total >= 2 && alive <= 1;
}

/** Auto-closes a room once it has had players and nobody remains connected past the disconnect grace period. */
export function shouldCloseEmptyRoom(room: Room, hadPlayers: boolean, now: number): boolean {
  const players = Object.values(room.players);
  if (!hadPlayers && players.length === 0) return false;
  if (players.length === 0) return true;
  return players.every(
    (p) => p.connected === false && now - (p.disconnectedAt ?? -Infinity) > DISCONNECT_GRACE_MS,
  );
}

/** A player who was in the room before this round started joins it; anyone who arrived later waits. */
export function shouldEnroll(room: Room, me: PlayerState | undefined): boolean {
  return room.status === "playing" && !!me && me.round !== room.round && me.joinedAt < room.startAt;
}

// --- Reading Realtime Database snapshots (it drops empty arrays and nulls) ---

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function normalizePlayer(raw: unknown): PlayerState {
  const p = obj(raw);
  return {
    name: str(p.name, "?"),
    joinedAt: num(p.joinedAt, 0),
    connected: p.connected !== false,
    disconnectedAt: typeof p.disconnectedAt === "number" ? p.disconnectedAt : null,
    round: num(p.round, -1),
    alive: p.alive !== false,
    score: num(p.score, 0),
    lives: num(p.lives, LIVES),
    map: num(p.map, 1),
    cleared: num(p.cleared, 0),
    accuracy: num(p.accuracy, 100),
    wpm: num(p.wpm, 0),
    eliminatedAt: typeof p.eliminatedAt === "number" ? p.eliminatedAt : null,
    missed: list(p.missed).filter((m): m is string => typeof m === "string"),
  };
}

export function normalizeRoom(raw: unknown): Room | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.hostUid !== "string") return null;
  if (r.status === "closed") return null;
  const settings = obj(r.settings);
  const status: RoomStatus = r.status === "playing" || r.status === "ended" ? r.status : "lobby";
  const players: Record<string, PlayerState> = {};
  for (const [uid, p] of Object.entries(obj(r.players))) players[uid] = normalizePlayer(p);
  const room: Room = {
    hostUid: r.hostUid,
    createdAt: num(r.createdAt, 0),
    round: num(r.round, 0),
    status,
    settings: {
      mode: settings.mode === "phrases" ? "phrases" : "words",
      difficulty: settings.difficulty === "normal" || settings.difficulty === "hard" ? settings.difficulty : "easy",
      durationMin: normalizeDurationMin(settings.durationMin),
    },
    seed: num(r.seed, 0),
    startAt: num(r.startAt, 0),
    endsAt: num(r.endsAt, 0),
    players,
  };
  if (r.results && typeof r.results === "object") {
    const res = obj(r.results);
    room.results = {
      ranking: list(res.ranking).filter((u): u is string => typeof u === "string"),
      cards: list(res.cards)
        .map(obj)
        .filter((c) => typeof c.uid === "string" && typeof c.band === "string" && typeof c.comment === "string")
        .map((c) => ({ uid: c.uid as string, band: c.band as string, comment: c.comment as string })),
      fallback: res.fallback === true,
    };
  }
  return room;
}
