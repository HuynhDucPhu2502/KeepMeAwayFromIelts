// Party room sync over Firebase Realtime Database.
// Only the host writes room-level fields; each player writes only rooms/{code}/players/{uid}.
import { firebase, serverNow } from "./firebase";
import {
  COUNTDOWN_MS,
  MAX_PLAYERS,
  ROUND_MS,
  cleanName,
  makeRoomCode,
  normalizeRoom,
  type PlayerState,
  type Room,
  type RoomSettings,
  type RoundResults,
} from "./room-logic";

export * from "./room-logic";
export { ensureSignedIn, serverNow } from "./firebase";

const roomPath = (code: string) => `rooms/${code}`;
const playerPath = (code: string, uid: string) => `rooms/${code}/players/${uid}`;

export async function getRoom(code: string): Promise<Room | null> {
  const { db, dbSdk } = await firebase();
  const snap = await dbSdk.get(dbSdk.ref(db, roomPath(code)));
  return normalizeRoom(snap.val());
}

/** Creates a lobby owned by `hostUid` and returns its 4-letter code. */
export async function createRoom(hostUid: string): Promise<string> {
  const { db, dbSdk } = await firebase();
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = makeRoomCode(Math.random);
    const ref = dbSdk.ref(db, roomPath(code));
    if ((await dbSdk.get(ref)).exists()) continue;
    try {
      // update() writes each field on its own path, which is what the per-field rules expect.
      await dbSdk.update(ref, {
        hostUid,
        createdAt: dbSdk.serverTimestamp(),
        round: 0,
        status: "lobby",
        settings: { mode: "words", difficulty: "easy" } satisfies RoomSettings,
        seed: 0,
        startAt: 0,
        endsAt: 0,
      });
      return code;
    } catch (error) {
      lastError = error; // most likely someone took the code in between: try another one
    }
  }
  throw lastError ?? new Error("Không tạo được phòng.");
}

let stopPresence: (() => void) | null = null;

/** Adds (or re-adds) this player to a room and keeps `connected` up to date. */
export async function joinRoom(code: string, uid: string, name: string): Promise<"ok" | "missing" | "full"> {
  const { db, dbSdk } = await firebase();
  const room = await getRoom(code);
  if (!room) return "missing";
  const ref = dbSdk.ref(db, playerPath(code, uid));
  const existing = room.players[uid];
  const cleaned = cleanName(name) || "Ẩn danh";
  if (existing) {
    await dbSdk.update(ref, { name: cleaned, connected: true, disconnectedAt: null });
  } else {
    if (Object.keys(room.players).length >= MAX_PLAYERS) return "full";
    const fresh: Omit<PlayerState, "joinedAt"> & { joinedAt: object } = {
      name: cleaned,
      joinedAt: dbSdk.serverTimestamp(),
      connected: true,
      disconnectedAt: null,
      round: -1,
      alive: false,
      score: 0,
      lives: 5,
      map: 1,
      cleared: 0,
      accuracy: 100,
      wpm: 0,
      eliminatedAt: null,
      missed: [],
    };
    await dbSdk.update(ref, fresh);
  }

  stopPresence?.();
  stopPresence = dbSdk.onValue(dbSdk.ref(db, ".info/connected"), (snap) => {
    if (snap.val() !== true) return;
    dbSdk
      .onDisconnect(ref)
      .update({ connected: false, disconnectedAt: dbSdk.serverTimestamp() })
      .then(() => dbSdk.update(ref, { connected: true, disconnectedAt: null }))
      .catch(() => {});
  });
  return "ok";
}

export function subscribeRoom(code: string, cb: (room: Room | null) => void): () => void {
  let off: (() => void) | null = null;
  let cancelled = false;
  firebase()
    .then(({ db, dbSdk }) => {
      if (cancelled) return;
      off = dbSdk.onValue(
        dbSdk.ref(db, roomPath(code)),
        (snap) => cb(normalizeRoom(snap.val())),
        () => cb(null),
      );
    })
    .catch(() => cb(null));
  return () => {
    cancelled = true;
    off?.();
  };
}

export async function startRound(code: string, room: Room, settings: RoomSettings): Promise<void> {
  const { db, dbSdk } = await firebase();
  const startAt = serverNow() + COUNTDOWN_MS;
  await dbSdk.update(dbSdk.ref(db, roomPath(code)), {
    round: room.round + 1,
    seed: Math.floor(Math.random() * 2 ** 31),
    settings,
    startAt,
    endsAt: startAt + ROUND_MS,
    status: "playing",
    results: null,
  });
}

export async function publishPlayer(code: string, uid: string, patch: Partial<PlayerState>): Promise<void> {
  const { db, dbSdk } = await firebase();
  await dbSdk.update(dbSdk.ref(db, playerPath(code, uid)), patch);
}

export async function endRound(code: string, results: RoundResults): Promise<void> {
  const { db, dbSdk } = await firebase();
  await dbSdk.update(dbSdk.ref(db, roomPath(code)), { status: "ended", results });
}

export async function backToLobby(code: string): Promise<void> {
  const { db, dbSdk } = await firebase();
  await dbSdk.update(dbSdk.ref(db, roomPath(code)), { status: "lobby", results: null });
}
