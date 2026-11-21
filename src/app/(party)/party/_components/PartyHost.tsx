"use client";

// Big-screen view for party mode: PIN, lobby with QR, live round board, results with band cards.
// The host page is the only writer of room-level fields and runs the end-of-round check.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { DIFFICULTIES, LIVES, type Difficulty, type Mode } from "@/lib/typing-engine";
import {
  DEFAULT_ROUND_MINUTES,
  LAST_SURVIVOR_DURATION,
  ROUND_MINUTES,
  addRoomCode,
  aliveCount,
  backToLobby,
  closeRoom,
  createRoom,
  endRound,
  ensureSignedIn,
  getRoom,
  isOut,
  parseRoomCodes,
  participants,
  rankPlayers,
  removeRoomCode,
  serverNow,
  shouldCloseEmptyRoom,
  shouldEnd,
  startRound,
  subscribeRoom,
  updateRoomSettings,
  type BandCard,
  type Room,
  type RoomSettings,
} from "@/lib/party/room";
import { fallbackCards } from "@/lib/party/report-core";
import {
  AvailabilityNotice,
  MODE_LABEL,
  errorText,
  formatClock,
  formatElapsed,
  settingsLabel,
  toReportPlayer,
  usePartyAvailability,
} from "./common";

const PIN_KEY = "kmafi:party:pin";
const ROOM_KEY = "kmafi:party:host-room";
const ROOMS_KEY = "kmafi:party:host-rooms";

function readStorage(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value == null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable: the host re-enters the PIN after a reload
  }
}

async function checkPin(pin: string): Promise<boolean> {
  const res = await fetch("/api/party/host", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return res.ok;
}

function cleanCards(value: unknown): BandCard[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const cards: BandCard[] = [];
  for (const c of value) {
    if (!c || typeof c !== "object") return null;
    const { uid, band, comment } = c as Record<string, unknown>;
    if (typeof uid !== "string" || typeof band !== "string" || typeof comment !== "string") return null;
    cards.push({ uid, band, comment });
  }
  return cards;
}

export default function PartyHost() {
  const availability = usePartyAvailability();
  const [pin, setPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [hostUid, setHostUid] = useState<string | null>(null);
  const [rooms, setRooms] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [now, setNow] = useState(0);
  const [settings, setSettings] = useState<RoomSettings>({
    mode: "words",
    difficulty: "easy",
    durationMin: DEFAULT_ROUND_MINUTES,
  });
  const [busy, setBusy] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const roomRef = useRef<Room | null | undefined>(undefined);
  const roomsRef = useRef<string[]>([]);
  const endingRound = useRef<number | null>(null);
  const syncedSettingsFor = useRef<string | null>(null);
  const hadPlayersByRoom = useRef<Set<string>>(new Set());
  const autoClosing = useRef<string | null>(null);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const persistRooms = useCallback((nextRooms: string[], nextCode: string | null) => {
    writeStorage(ROOMS_KEY, nextRooms.length > 0 ? JSON.stringify(nextRooms) : null);
    writeStorage(ROOM_KEY, nextCode);
  }, []);

  // A PIN entered earlier in this tab is re-checked silently.
  useEffect(() => {
    if (availability !== "on") return;
    const saved = readStorage(PIN_KEY);
    if (!saved) return;
    checkPin(saved)
      .then((ok) => {
        if (ok) setPin(saved);
        else writeStorage(PIN_KEY, null);
      })
      .catch(() => {});
  }, [availability]);

  // Sign in, then restore this tab's open rooms or create a fresh one.
  useEffect(() => {
    if (!pin) return;
    let active = true;
    (async () => {
      const uid = await ensureSignedIn();
      const savedActive = readStorage(ROOM_KEY);
      let candidates = parseRoomCodes(readStorage(ROOMS_KEY));
      if (savedActive) candidates = addRoomCode(candidates, savedActive);

      const checks = await Promise.all(
        candidates.map(async (c) => ({ code: c, existing: await getRoom(c) })),
      );
      let valid = checks.filter((x) => x.existing && x.existing.hostUid === uid).map((x) => x.code);
      let activeCode: string;
      if (valid.length > 0) {
        activeCode = savedActive && valid.includes(savedActive) ? savedActive : valid[0];
      } else {
        activeCode = await createRoom(uid);
        valid = [activeCode];
      }
      persistRooms(valid, activeCode);
      if (active) {
        setHostUid(uid);
        setRooms(valid);
        setCode(activeCode);
        setReady(true);
      }
    })().catch((e) => {
      if (active) setError(errorText(e));
    });
    return () => {
      active = false;
    };
  }, [pin, persistRooms]);

  useEffect(() => {
    if (!code) return;
    return subscribeRoom(code, (next) => {
      roomRef.current = next;
      setRoom(next);
      if (next && Object.values(next.players).some((p) => p.connected)) {
        hadPlayersByRoom.current.add(code);
      }
      if (next && syncedSettingsFor.current !== code) {
        syncedSettingsFor.current = code;
        setSettings(next.settings);
      }
    });
  }, [code]);

  useEffect(() => {
    if (!confirmClose) return;
    const id = window.setTimeout(() => setConfirmClose(false), 4_000);
    return () => window.clearTimeout(id);
  }, [confirmClose]);

  useEffect(() => {
    if (!code) return;
    QRCode.toString(`${window.location.origin}/party?room=${code}`, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1e293b", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [code]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), 250);
    return () => window.clearInterval(id);
  }, []);

  /** Ranks the round, asks Gemini (via our route) for band cards, then publishes the results. */
  const finish = useCallback(
    async (r: Room) => {
      if (!code || !pin || endingRound.current === r.round) return;
      endingRound.current = r.round;
      setFinishing(true);
      const ranking = rankPlayers(r, serverNow());
      const top = ranking.slice(0, 3).map((uid) => toReportPlayer(r, uid));
      let cards = fallbackCards(top);
      let fallback = true;
      if (top.length > 0) {
        try {
          const res = await fetch("/api/party/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin, players: top }),
            signal: AbortSignal.timeout(15_000),
          });
          if (res.ok) {
            const data = (await res.json()) as { cards?: unknown; fallback?: unknown };
            const fromServer = cleanCards(data.cards);
            if (fromServer) {
              cards = fromServer;
              fallback = data.fallback === true;
            }
          }
        } catch {
          // keep the template cards
        }
      }
      try {
        await endRound(code, { ranking, cards, fallback });
      } catch (e) {
        endingRound.current = null; // the end check retries in 500 ms
        setError(errorText(e));
      } finally {
        setFinishing(false);
      }
    },
    [code, pin],
  );

  const closeAndAdvance = useCallback(
    async (targetCode: string, reason?: string) => {
      await closeRoom(targetCode);
      hadPlayersByRoom.current.delete(targetCode);
      const nextRooms = removeRoomCode(roomsRef.current, targetCode);
      const nextCode = nextRooms[0] ?? null;
      persistRooms(nextRooms, nextCode);
      endingRound.current = null;
      syncedSettingsFor.current = null;
      roomRef.current = undefined;
      setRoom(undefined);
      setConfirmClose(false);
      setRooms(nextRooms);
      setCode(nextCode);
      setNotice(reason ?? null);
    },
    [persistRooms],
  );

  // End check every 500 ms: auto-close when everyone has left, or end round when one survivor/time is up.
  useEffect(() => {
    if (!code || !pin) return;
    const id = window.setInterval(() => {
      const r = roomRef.current;
      if (!r) return;
      const t = serverNow();
      if (shouldCloseEmptyRoom(r, hadPlayersByRoom.current.has(code), t)) {
        if (autoClosing.current === code) return;
        autoClosing.current = code;
        void closeAndAdvance(code, `Phòng ${code} đã tự đóng vì không còn người chơi.`)
          .catch((e) => setError(errorText(e)))
          .finally(() => {
            if (autoClosing.current === code) autoClosing.current = null;
          });
        return;
      }
      if (r.status === "playing" && shouldEnd(r, t)) void finish(r);
    }, 500);
    return () => window.clearInterval(id);
  }, [code, pin, finish, closeAndAdvance]);

  const onPin = async (event: FormEvent) => {
    event.preventDefault();
    const value = pinInput.trim();
    if (!value) return;
    setChecking(true);
    setPinError(null);
    try {
      if (await checkPin(value)) {
        writeStorage(PIN_KEY, value);
        setPin(value);
      } else setPinError("Sai mã PIN.");
    } catch {
      setPinError("Không kết nối được máy chủ.");
    } finally {
      setChecking(false);
    }
  };

  const onSelectRoom = (nextCode: string) => {
    if (nextCode === code) return;
    endingRound.current = null;
    syncedSettingsFor.current = null;
    roomRef.current = undefined;
    setRoom(undefined);
    setConfirmClose(false);
    setError(null);
    setNotice(null);
    writeStorage(ROOM_KEY, nextCode);
    setCode(nextCode);
  };

  const onNewRoom = async () => {
    setCreatingRoom(true);
    setError(null);
    setNotice(null);
    try {
      const uid = hostUid ?? (await ensureSignedIn());
      setHostUid(uid);
      const nextCode = await createRoom(uid);
      const nextRooms = addRoomCode(rooms, nextCode);
      persistRooms(nextRooms, nextCode);
      endingRound.current = null;
      syncedSettingsFor.current = null;
      roomRef.current = undefined;
      setRoom(undefined);
      setConfirmClose(false);
      setRooms(nextRooms);
      setCode(nextCode);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setCreatingRoom(false);
    }
  };

  const onCloseRoom = async () => {
    if (!code) return;
    if (room?.status === "playing" && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await closeAndAdvance(code);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const onSettings = (next: RoomSettings) => {
    setSettings(next);
    if (code && room?.status === "lobby") {
      updateRoomSettings(code, next).catch(() => {});
    }
  };

  const onStart = async () => {
    if (!code || !room) return;
    setBusy(true);
    setError(null);
    try {
      endingRound.current = null;
      await startRound(code, room, settings);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const onLobby = async () => {
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      await backToLobby(code);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  let body: ReactNode;
  if (availability !== "on") body = <AvailabilityNotice availability={availability} />;
  else if (!pin)
    body = (
      <div className="overlay">
        <form className="card card-small" onSubmit={onPin}>
          <Image src="/icons/party.png" alt="" width={68} height={68} className="result-hero-icon" unoptimized />
          <h1 className="title">
            Party <span className="accent">Host</span>
          </h1>
          <p className="muted small">Nhập mã PIN host để mở phòng trên màn hình lớn.</p>
          <input
            className="type-input party-pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="PIN"
            aria-label="Mã PIN host"
            autoFocus
          />
          {pinError && <p className="party-error">{pinError}</p>}
          <button type="submit" className="btn primary big" disabled={checking}>
            {checking ? "Đang kiểm tra…" : "Mở phòng"}
          </button>
        </form>
      </div>
    );
  else if (error && !room && !ready)
    body = (
      <div className="overlay">
        <div className="card card-small">
          <h2>Không mở được phòng</h2>
          <p className="party-error">{error}</p>
        </div>
      </div>
    );
  else if (!ready)
    body = (
      <div className="overlay">
        <div className="card card-small">
          <h2>Đang mở phòng…</h2>
        </div>
      </div>
    );
  else if (!code)
    body = (
      <div className="overlay">
        <div className="card card-small">
          <h2>Chưa có phòng nào đang mở</h2>
          <p className="muted small">Tạo phòng mới để người chơi quét QR hoặc nhập mã vào chơi.</p>
          <button type="button" className="btn primary big" disabled={creatingRoom} onClick={() => void onNewRoom()}>
            {creatingRoom ? "Đang tạo…" : "+ Mở phòng mới"}
          </button>
        </div>
      </div>
    );
  else if (room === undefined)
    body = (
      <div className="overlay">
        <div className="card card-small">
          <h2>Đang tải phòng {code}…</h2>
        </div>
      </div>
    );
  else if (room === null)
    body = (
      <div className="overlay">
        <div className="card card-small">
          <h2>Phòng {code} không còn nữa</h2>
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={creatingRoom}
              onClick={() => {
                const rest = removeRoomCode(rooms, code);
                if (rest.length > 0) {
                  persistRooms(rest, rest[0]);
                  setRooms(rest);
                  onSelectRoom(rest[0]);
                } else {
                  persistRooms([], null);
                  setRooms([]);
                  void onNewRoom();
                }
              }}
            >
              {removeRoomCode(rooms, code).length > 0 ? "Chuyển phòng khác" : "Mở phòng mới"}
            </button>
          </div>
        </div>
      </div>
    );
  else if (room.status === "lobby")
    body = (
      <HostLobby
        code={code}
        room={room}
        qr={qr}
        settings={settings}
        busy={busy}
        onSettings={onSettings}
        onStart={onStart}
      />
    );
  else if (room.status === "playing")
    body = <HostRound code={code} room={room} qr={qr} now={now} finishing={finishing} onEnd={() => void finish(room)} />;
  else body = <HostResults room={room} busy={busy || finishing} onLobby={onLobby} />;

  return (
    <div className="party-host">
      <header className="hud party-host-bar">
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/logo.png" alt="Keep Me Away From IELTS" width={32} height={32} className="brand-icon" unoptimized />
            <span>
              KEEP ME AWAY FROM <span className="accent">IELTS</span> · PARTY
            </span>
          </div>
        </div>
        {pin && ready && (
          <div className="party-host-controls">
            {rooms.length > 0 && (
              <nav className="party-room-tabs" aria-label="Danh sách phòng đang mở">
                {rooms.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`party-room-tab${c === code ? " active" : ""}`}
                    aria-current={c === code ? "page" : undefined}
                    onClick={() => onSelectRoom(c)}
                  >
                    {c}
                  </button>
                ))}
              </nav>
            )}
            <button
              type="button"
              className="btn btn-sm"
              disabled={creatingRoom || busy || finishing}
              onClick={() => void onNewRoom()}
            >
              {creatingRoom ? "Đang tạo…" : "+ Phòng mới"}
            </button>
            {code && room && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={busy || finishing}
                onClick={() => void onCloseRoom()}
              >
                {confirmClose ? "Xác nhận đóng?" : "Đóng phòng"}
              </button>
            )}
          </div>
        )}
      </header>
      {notice && <p className="party-notice-banner">{notice}</p>}
      {error && room && <p className="party-error party-host-error">{error}</p>}
      <main className="party-host-main">{body}</main>
    </div>
  );
}

function HostLobby(props: {
  code: string;
  room: Room;
  qr: string;
  settings: RoomSettings;
  busy: boolean;
  onSettings: (settings: RoomSettings) => void;
  onStart: () => void;
}) {
  const players = Object.entries(props.room.players).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  const online = players.filter(([, p]) => p.connected).length;
  return (
    <div className="party-lobby">
      <section className="party-join-panel">
        <div className="party-qr" aria-label={`Mã QR vào phòng ${props.code}`} dangerouslySetInnerHTML={{ __html: props.qr }} />
        <p className="party-scan">Quét QR bằng điện thoại để vào chơi</p>
        <p className="party-code">{props.code}</p>
        <p className="muted small">hoặc mở trang /party và nhập mã phòng</p>
      </section>
      <section className="party-lobby-side">
        <h2>
          {online} người đã vào <span className="muted small">(tối đa 30)</span>
        </h2>
        <ul className="party-names party-names-big">
          {players.length === 0 && <li className="muted">Chưa có ai, quét QR nào!</li>}
          {players.map(([uid, p]) => (
            <li key={uid} className={p.connected ? undefined : "offline"}>
              {p.name}
            </li>
          ))}
        </ul>
        <fieldset className="choice">
          <legend>Chế độ</legend>
          <div className="segmented segmented-2">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={m === props.settings.mode ? "selected" : undefined}
                aria-pressed={m === props.settings.mode}
                onClick={() => props.onSettings({ ...props.settings, mode: m })}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="choice">
          <legend>Độ khó</legend>
          <div className="segmented">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                className={d === props.settings.difficulty ? "selected" : undefined}
                aria-pressed={d === props.settings.difficulty}
                onClick={() => props.onSettings({ ...props.settings, difficulty: d })}
              >
                {DIFFICULTIES[d].label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="choice">
          <legend>Thời gian</legend>
          <div className="segmented segmented-6">
            {ROUND_MINUTES.map((mins) => (
              <button
                key={mins}
                type="button"
                className={[
                  mins === props.settings.durationMin ? "selected" : "",
                  mins === LAST_SURVIVOR_DURATION ? "segmented-full" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
                aria-pressed={mins === props.settings.durationMin}
                onClick={() => props.onSettings({ ...props.settings, durationMin: mins })}
              >
                {mins === LAST_SURVIVOR_DURATION ? "Người cuối cùng còn sống" : `${mins}p`}
              </button>
            ))}
          </div>
        </fieldset>
        <button type="button" className="btn primary big" disabled={online === 0 || props.busy} onClick={props.onStart}>
          Bắt đầu
        </button>
        <p className="muted tiny">
          {props.settings.durationMin === LAST_SURVIVOR_DURATION
            ? "Không giới hạn thời gian · để rơi 5 từ là bị loại · chơi tới người trụ lại cuối cùng · hết người tự đóng phòng."
            : `Vòng tối đa ${props.settings.durationMin} phút · để rơi 5 từ là bị loại · người trụ lại cuối cùng thắng · hết người tự đóng phòng.`}
        </p>
      </section>
    </div>
  );
}

function HostRound(props: { code: string; room: Room; qr: string; now: number; finishing: boolean; onEnd: () => void }) {
  const { room, now } = props;
  const ranking = rankPlayers(room, now);
  const total = participants(room).length;
  const alive = aliveCount(room, now);
  const waiting = Object.values(room.players).filter((p) => p.round !== room.round && p.connected).length;
  const countdown = now < room.startAt;
  const unlimited = room.endsAt === 0;
  return (
    <div className="party-round">
      <div className="party-round-head">
        <span className="muted">{settingsLabel(room.settings.mode, room.settings.difficulty, room.settings.durationMin)}</span>
        <span className="party-clock">
          ⏱ {unlimited ? (countdown ? "∞" : formatElapsed(Math.max(0, now - room.startAt))) : formatClock(room.endsAt - Math.max(now, room.startAt))}
        </span>
      </div>
      {countdown ? (
        <p className="party-big-count">{Math.max(1, Math.ceil((room.startAt - now) / 1000))}</p>
      ) : (
        <p className="party-alive">
          CÒN {alive} / {total} NGƯỜI
        </p>
      )}
      {props.finishing && <p className="party-live party-finishing">Đang tổng kết, giám khảo Gemini đang chấm band…</p>}
      <ol className="party-board" aria-label="Bảng xếp hạng trực tiếp">
        {ranking.map((uid, i) => {
          const p = room.players[uid];
          const out = isOut(p, now);
          const classes = [out && "out", !out && i < 3 && `top top-${i + 1}`].filter(Boolean).join(" ");
          return (
            <li key={uid} className={classes || undefined}>
              <span className="board-rank" aria-label={`Hạng ${i + 1}`}>
                {!out && i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
              </span>
              <strong className="board-name">{p.name}</strong>
              <span className="board-score">{p.score.toLocaleString("vi-VN")}</span>
              {out ? (
                <span className="board-state">{p.alive ? "mất kết nối" : "loại"}</span>
              ) : (
                <span className="lives" aria-label={`Còn ${p.lives} mạng`}>
                  {Array.from({ length: LIVES }, (_, i) => (
                    <span key={i} className={i < p.lives ? "heart" : "heart lost"} aria-hidden>
                      ♥
                    </span>
                  ))}
                </span>
              )}
            </li>
          );
        })}
        {ranking.length === 0 && <li className="muted">Đang chờ người chơi vào vòng…</li>}
      </ol>
      <div className="party-round-foot">
        <button type="button" className="btn" disabled={props.finishing || countdown} onClick={props.onEnd}>
          Kết thúc vòng ngay
        </button>
        <div className="party-mini-qr">
          <div className="party-qr small" dangerouslySetInnerHTML={{ __html: props.qr }} />
          <span className="muted small">
            Phòng {props.code}
            <br />
            {waiting > 0 ? `${waiting} người chờ vòng sau` : "Vào để chờ vòng sau"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HostResults({ room, busy, onLobby }: { room: Room; busy: boolean; onLobby: () => void }) {
  const results = room.results;
  const ranking = results?.ranking ?? [];
  const winner = ranking[0] ? room.players[ranking[0]] : undefined;
  return (
    <div className="party-results">
      {winner && <Image src="/icons/trophy.png" alt="" width={78} height={78} className="result-hero-icon" unoptimized />}
      <h2 className="party-winner">{winner ? `${winner.name} thắng!` : "Vòng kết thúc"}</h2>
      <ol className="party-cards">
        {ranking.slice(0, 3).map((uid, i) => {
          const p = room.players[uid];
          const card = results?.cards.find((c) => c.uid === uid);
          return (
            <li key={uid} className={`party-result-card place-${i + 1}`}>
              <span className="podium-place">{["🥇", "🥈", "🥉"][i]}</span>
              <strong className="board-name">{p?.name ?? "?"}</strong>
              <span className="board-score">{(p?.score ?? 0).toLocaleString("vi-VN")} điểm</span>
              <span className="muted small">
                Map {p?.map ?? 1} · {p?.wpm ?? 0} WPM · chính xác {p?.accuracy ?? 100}%
              </span>
              {card && (
                <div className="band-card">
                  <span className="band-label">Band</span>
                  <strong className="band-value">{card.band}</strong>
                  <p>{card.comment}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {results?.fallback && ranking.length > 0 && <p className="muted tiny">Phiếu chấm theo mẫu (Gemini chưa trả lời kịp).</p>}
      {ranking.length > 3 && (
        <ol className="party-rest" start={4}>
          {ranking.slice(3).map((uid) => (
            <li key={uid}>
              {room.players[uid]?.name ?? "?"} · {(room.players[uid]?.score ?? 0).toLocaleString("vi-VN")}
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="btn primary big" disabled={busy} onClick={onLobby}>
        Vòng mới
      </button>
    </div>
  );
}
