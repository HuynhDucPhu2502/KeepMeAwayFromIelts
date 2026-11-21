// Pure party-room rules: who is still in, who wins, when a round ends. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ROUND_MINUTES,
  DISCONNECT_GRACE_MS,
  LAST_SURVIVOR_DURATION,
  MAX_NAME,
  ROOM_ALPHABET,
  ROUND_MINUTES,
  ROUND_MS,
  addRoomCode,
  cleanName,
  freshRoundState,
  isOut,
  isRoomCode,
  makeRoomCode,
  normalizeDurationMin,
  normalizeRoom,
  parseRoomCodes,
  participants,
  rankPlayers,
  removeRoomCode,
  roundDurationMs,
  shouldCloseEmptyRoom,
  shouldEnd,
  shouldEnroll,
} from "../src/lib/party/room-logic.ts";

const START = 1_000_000;

function player(overrides = {}) {
  return {
    name: "P",
    joinedAt: START - 60_000,
    connected: true,
    disconnectedAt: null,
    round: 1,
    alive: true,
    score: 0,
    lives: 5,
    map: 1,
    cleared: 0,
    accuracy: 100,
    wpm: 0,
    eliminatedAt: null,
    missed: [],
    ...overrides,
  };
}

function room(players, overrides = {}) {
  return {
    hostUid: "host",
    createdAt: START - 120_000,
    round: 1,
    status: "playing",
    settings: { mode: "words", difficulty: "easy" },
    seed: 42,
    startAt: START,
    endsAt: START + ROUND_MS,
    players,
    ...overrides,
  };
}

const MID = START + 30_000;

test("round cap is 3 minutes", () => {
  assert.equal(ROUND_MS, 180_000);
});

test("last two eliminated in the same publish window: the higher score wins", () => {
  const r = room({
    a: player({ alive: false, score: 500, eliminatedAt: MID }),
    b: player({ alive: false, score: 900, eliminatedAt: MID }),
    c: player({ alive: false, score: 1200, eliminatedAt: MID - 10_000 }),
  });
  // c has the best score but was out earlier; ranking is alive first, then score, then eliminatedAt.
  assert.deepEqual(rankPlayers(r, MID + 100), ["c", "b", "a"]);
  assert.equal(shouldEnd(r, MID + 100), true);
});

test("a survivor ranks above eliminated players with higher scores", () => {
  const r = room({
    a: player({ alive: false, score: 2000, eliminatedAt: MID }),
    b: player({ alive: true, score: 100 }),
  });
  assert.deepEqual(rankPlayers(r, MID), ["b", "a"]);
});

test("equal scores: the player eliminated later ranks higher", () => {
  const r = room({
    early: player({ alive: false, score: 300, eliminatedAt: MID - 5_000 }),
    late: player({ alive: false, score: 300, eliminatedAt: MID }),
  });
  assert.deepEqual(rankPlayers(r, MID), ["late", "early"]);
});

test("a one-player round ends only when that player is out (or time is up)", () => {
  const alive = room({ solo: player({ alive: true, score: 50 }) });
  assert.equal(shouldEnd(alive, MID), false);
  const out = room({ solo: player({ alive: false, score: 50, eliminatedAt: MID }) });
  assert.equal(shouldEnd(out, MID), true);
});

test("with two or more participants the round ends when at most one is alive", () => {
  const r = room({
    a: player({ alive: true }),
    b: player({ alive: true }),
    c: player({ alive: false, eliminatedAt: MID }),
  });
  assert.equal(shouldEnd(r, MID), false);
  r.players.b = player({ alive: false, eliminatedAt: MID });
  assert.equal(shouldEnd(r, MID), true);
});

test("the time cap ends the round even with several players alive", () => {
  const r = room({ a: player(), b: player() });
  assert.equal(shouldEnd(r, START + ROUND_MS - 1), false);
  assert.equal(shouldEnd(r, START + ROUND_MS), true);
});

test("nothing ends during the countdown or outside the playing status", () => {
  const r = room({});
  assert.equal(shouldEnd(r, START - 1), false); // nobody has enrolled yet, still counting down
  assert.equal(shouldEnd({ ...r, status: "lobby" }, START + ROUND_MS + 1), false);
  assert.equal(shouldEnd({ ...r, status: "ended" }, START + ROUND_MS + 1), false);
});

test("a participant disconnected for more than 10 s counts as out", () => {
  const gone = player({ connected: false, disconnectedAt: MID, score: 999 });
  assert.equal(DISCONNECT_GRACE_MS, 10_000);
  assert.equal(isOut(gone, MID + DISCONNECT_GRACE_MS), false);
  assert.equal(isOut(gone, MID + DISCONNECT_GRACE_MS + 1), true);

  const r = room({ locked: gone, b: player({ score: 10 }), c: player({ score: 20 }) });
  assert.equal(shouldEnd(r, MID + 5_000), false);
  r.players.c = player({ alive: false, score: 20, eliminatedAt: MID + 1_000 });
  // b is the only one really alive, but the locked phone is still within its grace period.
  assert.equal(shouldEnd(r, MID + 5_000), false);
  assert.equal(shouldEnd(r, MID + DISCONNECT_GRACE_MS + 1), true);
  assert.deepEqual(rankPlayers(r, MID + DISCONNECT_GRACE_MS + 1), ["b", "locked", "c"]);
});

test("players from other rounds (late joiners) are not participants", () => {
  const r = room({
    a: player({ alive: true }),
    late: player({ round: 0, joinedAt: START + 1_000 }),
    old: player({ round: -1 }),
  });
  assert.deepEqual(
    participants(r).map(([uid]) => uid),
    ["a"],
  );
  assert.deepEqual(rankPlayers(r, MID), ["a"]);
  // Only "a" is in the round, so the late joiner does not keep it going.
  assert.equal(shouldEnd(r, MID), false);
  r.players.a = player({ alive: false, eliminatedAt: MID });
  assert.equal(shouldEnd(r, MID), true);
});

test("shouldEnroll: lobby players join the new round, mid-round joiners wait", () => {
  const r = room({}, { round: 3 });
  assert.equal(shouldEnroll(r, player({ round: 2, joinedAt: START - 1 })), true);
  assert.equal(shouldEnroll(r, player({ round: -1, joinedAt: START - 10 })), true);
  assert.equal(shouldEnroll(r, player({ round: 3 })), false); // already in
  assert.equal(shouldEnroll(r, player({ round: 2, joinedAt: START + 1 })), false); // joined after the start
  assert.equal(shouldEnroll({ ...r, status: "lobby" }, player({ round: 2 })), false);
  assert.equal(shouldEnroll(r, undefined), false);
});

test("freshRoundState resets the round fields only", () => {
  const s = freshRoundState(4);
  assert.deepEqual(s, {
    round: 4,
    alive: true,
    score: 0,
    lives: 5,
    map: 1,
    cleared: 0,
    accuracy: 100,
    wpm: 0,
    eliminatedAt: null,
    missed: [],
    connected: true,
    disconnectedAt: null,
  });
});

test("makeRoomCode gives 4 letters without I or O", () => {
  assert.ok(!ROOM_ALPHABET.includes("I") && !ROOM_ALPHABET.includes("O"));
  assert.equal(ROOM_ALPHABET.length, 24);
  for (let i = 0; i < 200; i++) {
    const code = makeRoomCode(Math.random);
    assert.match(code, /^[A-HJ-NP-Z]{4}$/);
  }
  assert.equal(makeRoomCode(() => 0), "AAAA");
  assert.equal(makeRoomCode(() => 0.9999999), "ZZZZ");
});

test("cleanName trims, collapses spaces and caps the length", () => {
  assert.equal(MAX_NAME, 16);
  assert.equal(cleanName("  Minh   Anh  "), "Minh Anh");
  assert.equal(cleanName("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnop");
  assert.equal(cleanName("   "), "");
});

test("normalizeRoom fills what Realtime Database drops (empty arrays, nulls)", () => {
  assert.equal(normalizeRoom(null), null);
  assert.equal(normalizeRoom("nope"), null);
  assert.equal(normalizeRoom({ round: 1 }), null); // no hostUid: not a room

  const r = normalizeRoom({
    hostUid: "h",
    createdAt: 1,
    round: 2,
    status: "playing",
    settings: { mode: "phrases", difficulty: "hard" },
    seed: 9,
    startAt: 10,
    endsAt: 20,
    players: { u1: { name: "Lan", joinedAt: 5, connected: true, round: 2, alive: true, score: 3 } },
  });
  assert.equal(r.players.u1.eliminatedAt, null);
  assert.deepEqual(r.players.u1.missed, []);
  assert.equal(r.players.u1.lives, 5);
  assert.equal(r.players.u1.disconnectedAt, null);
  assert.equal(r.results, undefined);

  const empty = normalizeRoom({ hostUid: "h", status: "weird" });
  assert.deepEqual(empty.players, {});
  assert.equal(empty.status, "lobby");
  assert.deepEqual(empty.settings, { mode: "words", difficulty: "easy", durationMin: 3 });

  const customDuration = normalizeRoom({
    hostUid: "h",
    settings: { mode: "phrases", difficulty: "hard", durationMin: 15 },
  });
  assert.deepEqual(customDuration.settings, { mode: "phrases", difficulty: "hard", durationMin: 15 });

  const invalidDuration = normalizeRoom({ hostUid: "h", settings: { durationMin: 99 } });
  assert.equal(invalidDuration.settings.durationMin, DEFAULT_ROUND_MINUTES);

  const ended = normalizeRoom({ hostUid: "h", status: "ended", results: { ranking: { 0: "a", 1: "b" }, fallback: true } });
  assert.deepEqual(ended.results, { ranking: ["a", "b"], cards: [], fallback: true });

  assert.equal(normalizeRoom({ hostUid: "h", status: "closed" }), null);
});

test("round duration options allow 3, 5, 7, 10, 15, 30 minutes and last survivor (0)", () => {
  assert.deepEqual([...ROUND_MINUTES], [3, 5, 7, 10, 15, 30, 0]);
  for (const mins of ROUND_MINUTES) {
    assert.equal(normalizeDurationMin(mins), mins);
    assert.equal(roundDurationMs(mins), mins * 60_000);
  }
  assert.equal(normalizeDurationMin(LAST_SURVIVOR_DURATION), 0);
  assert.equal(normalizeDurationMin(undefined), 3);
  assert.equal(normalizeDurationMin(4), 3);
  assert.equal(normalizeDurationMin("10"), 3);

  const unlimited = normalizeRoom({
    hostUid: "h",
    settings: { mode: "words", difficulty: "easy", durationMin: 0 },
  });
  assert.equal(unlimited.settings.durationMin, 0);
});

test("last survivor mode (endsAt = 0) never times out, ends only on elimination", () => {
  const r = room({ a: player(), b: player() }, { endsAt: 0 });
  assert.equal(shouldEnd(r, START + 60 * 60_000), false); // 1 hour later, both alive
  r.players.b = player({ alive: false, eliminatedAt: START + 10_000 });
  assert.equal(shouldEnd(r, START + 10_100), true); // 1 survivor left
});

test("shouldCloseEmptyRoom closes only after players have joined and everyone is gone", () => {
  const freshEmpty = room({}, { status: "lobby" });
  assert.equal(shouldCloseEmptyRoom(freshEmpty, false, MID), false);
  // Everyone explicitly left in lobby (players map empty, but hadPlayers is true)
  assert.equal(shouldCloseEmptyRoom(freshEmpty, true, MID), true);

  // At least one player connected -> stays open
  const active = room({ a: player({ connected: true }), b: player({ connected: false, disconnectedAt: MID - 20_000 }) });
  assert.equal(shouldCloseEmptyRoom(active, true, MID), false);

  // Everyone disconnected, within grace period -> stays open
  const recentDrop = room({
    a: player({ connected: false, disconnectedAt: MID - 5_000 }),
    b: player({ connected: false, disconnectedAt: MID - 20_000 }),
  });
  assert.equal(shouldCloseEmptyRoom(recentDrop, true, MID), false);

  // Everyone disconnected past grace period -> auto-close (even if hadPlayers flag reset across reload)
  const allGone = room({
    a: player({ connected: false, disconnectedAt: MID - DISCONNECT_GRACE_MS - 1 }),
    b: player({ connected: false, disconnectedAt: MID - 20_000 }),
  });
  assert.equal(shouldCloseEmptyRoom(allGone, false, MID), true);
  assert.equal(shouldCloseEmptyRoom(allGone, true, MID), true);
});

test("multi-room code helpers validate, deduplicate, parse and remove codes", () => {
  assert.equal(isRoomCode("ABCD"), true);
  assert.equal(isRoomCode("ABCI"), false); // I is excluded
  assert.equal(isRoomCode("ABCO"), false); // O is excluded
  assert.equal(isRoomCode("ABC"), false);
  assert.equal(isRoomCode("abcd"), false);

  assert.deepEqual(addRoomCode([], "ABCD"), ["ABCD"]);
  assert.deepEqual(addRoomCode(["ABCD"], "ABCD"), ["ABCD"]);
  assert.deepEqual(addRoomCode(["ABCD"], "EFGH"), ["ABCD", "EFGH"]);
  assert.deepEqual(addRoomCode(["ABCD"], "BAD!"), ["ABCD"]);

  assert.deepEqual(removeRoomCode(["ABCD", "EFGH"], "ABCD"), ["EFGH"]);
  assert.deepEqual(removeRoomCode(["ABCD"], "ZZZZ"), ["ABCD"]);

  assert.deepEqual(parseRoomCodes(null), []);
  assert.deepEqual(parseRoomCodes("not json"), []);
  assert.deepEqual(parseRoomCodes('{"a":1}'), []);
  assert.deepEqual(parseRoomCodes('["ABCD","EFGH","ABCD","NOPE","ABIO",123]'), ["ABCD", "EFGH"]);
});
