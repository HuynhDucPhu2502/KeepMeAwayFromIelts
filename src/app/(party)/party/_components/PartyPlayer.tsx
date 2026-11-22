"use client";

// Phone view for party mode: join a room, wait in the lobby, play the round locally, see the result.
// The game itself runs entirely on this phone; only the score, lives and alive flag go to Firebase.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { loadVocab, type VocabData } from "@/lib/vocab";
import {
  DIFFICULTIES,
  LIVES,
  RANDS_PER_TICK,
  initialState,
  partyPool,
  pendingExact,
  reducer,
  stats,
  type Difficulty,
  type GameState,
  type Mode,
} from "@/lib/typing-engine";
import { Lane } from "@/components/Lane";
import { SoundToggle } from "@/components/SoundToggle";
import { playBossDefeat, playError, playGameOver, playHeart, playKey, playSuccess } from "@/lib/sfx";
import {
  DEFAULT_ROUND_MINUTES,
  DISCONNECT_GRACE_MS,
  LAST_SURVIVOR_DURATION,
  MAX_NAME,
  ROUND_MINUTES,
  aliveCount,
  backToLobby,
  closeRoom,
  createRoom,
  endRound,
  ensureSignedIn,
  freshRoundState,
  joinRoom,
  leaveRoom,
  participants,
  publishPlayer,
  rankPlayers,
  serverNow,
  shouldCloseEmptyRoom,
  shouldEnd,
  shouldEnroll,
  startRound,
  subscribeRoom,
  updateRoomSettings,
  type PlayerState,
  type Room,
  type RoomSettings,
} from "@/lib/party/room";
import { fallbackCards } from "@/lib/party/report-core";
import {
  AvailabilityNotice,
  MODE_LABEL,
  Notice,
  errorText,
  formatClock,
  formatElapsed,
  settingsLabel,
  toReportPlayer,
  usePartyAvailability,
} from "./common";

// Shared vocabulary imported from @/lib/vocab (WORDS, PHRASES)
const SAVED_KEY = "kmafi:party:join";
const PUBLISH_EVERY_MS = 500;

interface Session {
  code: string;
  uid: string;
  name: string;
}

// Which round this tab plays in; mirrored in a ref so the timer loop can read it.
interface Control {
  localRound: number | null; // enrolled in this round
  startedRound: number | null; // engine started for this round
  forfeitRound: number | null; // knocked out without the engine ending (backgrounded too long, reloaded)
}

const cleanCode = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);

function readSaved(): { code: string; name: string } | null {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(SAVED_KEY) ?? "null");
    if (value && typeof value === "object" && "code" in value && "name" in value) {
      const { code, name } = value as { code: unknown; name: unknown };
      if (typeof code === "string" && typeof name === "string") return { code, name };
    }
  } catch {
    // storage unavailable
  }
  return null;
}

function writeSaved(code: string, name: string) {
  try {
    window.sessionStorage.setItem(SAVED_KEY, JSON.stringify({ code, name }));
  } catch {
    // storage unavailable: the player just re-enters their name after a reload
  }
}

function clearSaved() {
  try {
    window.sessionStorage.removeItem(SAVED_KEY);
  } catch {
    // ignore
  }
}

function replaceRoomUrl(code: string | null) {
  try {
    const nextUrl = code ? `/party?room=${code}` : "/party";
    window.history.replaceState(null, "", nextUrl);
  } catch {
    // ignore
  }
}

export default function PartyPlayer() {
  const availability = usePartyAvailability();
  const params = useSearchParams();
  const [entryTab, setEntryTab] = useState<"join" | "create">(() => (params.get("tab") === "create" ? "create" : "join"));
  const [codeInput, setCodeInput] = useState(() => cleanCode(params.get("room") ?? ""));
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [now, setNow] = useState(0);
  const [control, setControl] = useState<Control>({ localRound: null, startedRound: null, forfeitRound: null });
  const [engine, dispatch] = useReducer(reducer, undefined, () => initialState("words", "easy"));
  const [hostSettings, setHostSettings] = useState<RoomSettings>({
    mode: "words",
    difficulty: "easy",
    durationMin: DEFAULT_ROUND_MINUTES,
  });
  const [hostBusy, setHostBusy] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const roomRef = useRef<Room | null | undefined>(undefined);
  const engineRef = useRef<GameState>(engine);
  const controlRef = useRef<Control>(control);
  const publishState = useRef({ at: 0, sig: "", eliminatedAt: null as number | null, enrolling: -1 });
  const hiddenAt = useRef<number | null>(null);
  const endingRound = useRef<number | null>(null);
  const syncedSettingsFor = useRef<string | null>(null);
  const vocabRef = useRef<VocabData | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  });

  const updateControl = useCallback((patch: Partial<Control>) => {
    controlRef.current = { ...controlRef.current, ...patch };
    setControl(controlRef.current);
  }, []);

  const join = useCallback(async (code: string, name: string) => {
    setJoining(true);
    setJoinError(null);
    try {
      const uid = await ensureSignedIn();
      const result = await joinRoom(code, uid, name);
      if (result === "missing") setJoinError(`Không tìm thấy phòng ${code}. Kiểm tra lại mã phòng nhé.`);
      else if (result === "full") setJoinError("Phòng đã đủ 30 người rồi, chờ lượt sau nhé.");
      else {
        writeSaved(code, name);
        replaceRoomUrl(code);
        setSession({ code, uid, name });
      }
    } catch (error) {
      setJoinError(errorText(error));
    } finally {
      setJoining(false);
    }
  }, []);

  const createAndJoin = useCallback(async (name: string) => {
    setJoining(true);
    setJoinError(null);
    try {
      const uid = await ensureSignedIn();
      const code = await createRoom(uid);
      const result = await joinRoom(code, uid, name);
      if (result !== "ok") {
        setJoinError("Không tạo được phòng. Thử lại nhé.");
        return;
      }
      writeSaved(code, name);
      replaceRoomUrl(code);
      setCodeInput(code);
      setSession({ code, uid, name });
    } catch (error) {
      setJoinError(errorText(error));
    } finally {
      setJoining(false);
    }
  }, []);

  const resetToEntry = useCallback(() => {
    clearSaved();
    replaceRoomUrl(null);
    endingRound.current = null;
    syncedSettingsFor.current = null;
    roomRef.current = undefined;
    publishState.current = { at: 0, sig: "", eliminatedAt: null, enrolling: -1 };
    setSession(null);
    setRoom(undefined);
    setHostError(null);
    setQr("");
    setCopied(false);
    updateControl({ localRound: null, startedRound: null, forfeitRound: null });
    dispatch({ type: "menu" });
  }, [updateControl]);

  // After a reload of this tab, rejoin the same room with the same name.
  useEffect(() => {
    if (availability !== "on") return;
    const saved = readSaved();
    const wanted = cleanCode(params.get("room") ?? "");
    if (!saved || (wanted && wanted !== saved.code)) return;
    void Promise.resolve().then(() => {
      setNameInput(saved.name);
      setCodeInput(saved.code);
      return join(saved.code, saved.name);
    });
  }, [availability, params, join]);

  // Keep the layout the size of the visible area, so the input stays above the phone keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = rootRef.current;
    if (!vv || !el) return;
    const apply = () => {
      el.style.height = `${vv.height}px`;
      el.style.transform = `translateY(${vv.offsetTop}px)`;
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadVocab().then((data) => {
      vocabRef.current = data;
    });
    return subscribeRoom(session.code, (next) => {
      roomRef.current = next;
      if (next && syncedSettingsFor.current !== session.code) {
        syncedSettingsFor.current = session.code;
        setHostSettings(next.settings);
      }
    });
  }, [session]);

  const isHost = !!room && !!session && room.hostUid === session.uid;

  useEffect(() => {
    if (!isHost || !session) return;
    let active = true;
    void import("qrcode")
      .then((mod) =>
        mod.default.toString(`${window.location.origin}/party?room=${session.code}`, {
          type: "svg",
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#1e293b", light: "#ffffff" },
        }),
      )
      .then((svg) => {
        if (active) setQr(svg);
      })
      .catch(() => {
        if (active) setQr("");
      });
    return () => {
      active = false;
    };
  }, [isHost, session]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2_000);
    return () => window.clearTimeout(id);
  }, [copied]);

  /** Sends this phone's round state, skipping duplicates. */
  const publish = useCallback(() => {
    const r = roomRef.current;
    const ctl = controlRef.current;
    if (!session || !r || r.status !== "playing" || ctl.startedRound !== r.round) return;
    const s = engineRef.current;
    const out = s.status === "over" || ctl.forfeitRound === r.round;
    const ps = publishState.current;
    if (out && ps.eliminatedAt == null) ps.eliminatedAt = serverNow();
    const { wpm, accuracy } = stats(s);
    const patch: Partial<PlayerState> = {
      score: s.score,
      lives: s.lives,
      map: s.map,
      cleared: s.cleared,
      accuracy,
      wpm,
      alive: !out,
      missed: s.missed.slice(0, 20).map((m) => m.text),
      eliminatedAt: out ? ps.eliminatedAt : null,
    };
    const sig = JSON.stringify(patch);
    if (sig === ps.sig) return;
    ps.sig = sig;
    ps.at = performance.now();
    publishPlayer(session.code, session.uid, patch).catch(() => {
      ps.sig = ""; // retry on the next pass
    });
  }, [session]);

  /** Ends a player-hosted round using free template band cards (never calls Gemini / Vertex AI). */
  const finishAsHost = useCallback(
    async (r: Room) => {
      if (!session || r.hostUid !== session.uid || endingRound.current === r.round) return;
      endingRound.current = r.round;
      publish();
      // Include this device's freshest local stats in case the last 500 ms tick hasn't echoed back yet.
      let snapshot = r;
      const ctl = controlRef.current;
      const me = r.players[session.uid];
      if (me && ctl.startedRound === r.round) {
        const s = engineRef.current;
        const localOut = s.status === "over" || ctl.forfeitRound === r.round;
        const { wpm, accuracy } = stats(s);
        snapshot = {
          ...r,
          players: {
            ...r.players,
            [session.uid]: {
              ...me,
              score: s.score,
              lives: s.lives,
              map: s.map,
              cleared: s.cleared,
              accuracy,
              wpm,
              alive: !localOut,
              missed: s.missed.slice(0, 20).map((m) => m.text),
              eliminatedAt: localOut ? (publishState.current.eliminatedAt ?? me.eliminatedAt ?? serverNow()) : null,
            },
          },
        };
      }
      const ranking = rankPlayers(snapshot, serverNow());
      const top = ranking.slice(0, 3).map((uid) => toReportPlayer(snapshot, uid));
      const cards = fallbackCards(top);
      try {
        await endRound(session.code, { ranking, cards, fallback: true });
      } catch (e) {
        endingRound.current = null; // retries on the next 500 ms tick
        setHostError(errorText(e));
      }
    },
    [session, publish],
  );

  // Player-host end check every 500 ms: auto-close if empty, or end round when one survivor/time is up (without Gemini).
  useEffect(() => {
    if (!session || !isHost) return;
    const id = window.setInterval(() => {
      const r = roomRef.current;
      if (!r || r.hostUid !== session.uid) return;
      const t = serverNow();
      if (shouldCloseEmptyRoom(r, true, t)) {
        void closeRoom(session.code).finally(resetToEntry);
        return;
      }
      if (r.status === "playing" && shouldEnd(r, t)) {
        void finishAsHost(r);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [session, isHost, finishAsHost, resetToEntry]);

  // Controller: server clock, room snapshot, joining the round, starting the engine, periodic publish.
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      const t = serverNow();
      setNow(t);
      const r = roomRef.current;
      setRoom(r);
      if (!r) return;
      const ctl = controlRef.current;
      const me = r.players[session.uid];
      const ps = publishState.current;

      if (r.status === "lobby" && engineRef.current.status !== "menu") dispatch({ type: "menu" });
      if (r.status !== "playing") return;

      if (ctl.localRound !== r.round) {
        if (shouldEnroll(r, me)) {
          if (ps.enrolling !== r.round) {
            ps.enrolling = r.round;
            publishPlayer(session.code, session.uid, freshRoundState(r.round)).catch(() => {
              ps.enrolling = -1;
            });
          }
          dispatch({ type: "menu" });
          updateControl({ localRound: r.round });
        } else if (me && me.round === r.round) {
          if (t < r.startAt) {
            updateControl({ localRound: r.round }); // reloaded during the countdown: still in
          } else if (me.alive && ctl.forfeitRound !== r.round) {
            // Reloaded mid-round: the local game is gone, so this phone is out.
            updateControl({ forfeitRound: r.round });
            publishPlayer(session.code, session.uid, { alive: false, eliminatedAt: t }).catch(() => {});
          }
        }
        return;
      }

      if (ctl.startedRound !== r.round && t >= r.startAt && (r.endsAt === 0 || t < r.endsAt)) {
        const vocab = vocabRef.current;
        if (!vocab) {
          void loadVocab().then((data) => {
            vocabRef.current = data;
          });
          return;
        }
        ps.sig = "";
        ps.eliminatedAt = null;
        const { mode, difficulty } = r.settings;
        dispatch({
          type: "start",
          pool: partyPool(mode, difficulty, vocab.words, vocab.phrases),
          best: 0,
          mode,
          difficulty,
          party: { seed: r.seed },
        });
        updateControl({ startedRound: r.round });
        return;
      }
      if (performance.now() - ps.at >= PUBLISH_EVERY_MS) publish();
    }, 100);
    return () => window.clearInterval(id);
  }, [session, publish, updateControl]);

  // Publish straight away when a life is lost (or gained) and when the run ends.
  useEffect(() => {
    publish();
  }, [engine.lives, engine.status, publish]);

  // A phone that is backgrounded is marked disconnected; more than 10 s away and it is out.
  useEffect(() => {
    if (!session) return;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = serverNow();
        publishPlayer(session.code, session.uid, { connected: false, disconnectedAt: hiddenAt.current }).catch(() => {});
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      const r = roomRef.current;
      const ctl = controlRef.current;
      if (
        since != null &&
        r &&
        r.status === "playing" &&
        ctl.startedRound === r.round &&
        ctl.forfeitRound !== r.round &&
        engineRef.current.status === "playing" &&
        serverNow() - since > DISCONNECT_GRACE_MS
      ) {
        publishState.current.eliminatedAt = since + DISCONNECT_GRACE_MS;
        updateControl({ forfeitRound: r.round });
      }
      publishPlayer(session.code, session.uid, { connected: true, disconnectedAt: null }).catch(() => {});
      publish();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [session, publish, updateControl]);

  // --- What to show ---
  const inRound = !!room && room.status !== "lobby" && control.localRound === room.round;
  const started = inRound && control.startedRound === room.round;
  const forfeited = inRound && control.forfeitRound === room.round;
  const out = started && (engine.status === "over" || forfeited);
  const timeUp = !!room && room.status === "playing" && room.endsAt > 0 && now >= room.endsAt;
  const countdown = !!room && room.status === "playing" && inRound && (now < room.startAt || !started) && !timeUp;
  const running = !!room && room.status === "playing" && started && !out && !timeUp && engine.status === "playing";
  const canType = !!room && room.status === "playing" && inRound && !out && !timeUp;

  // Game loop, as in solo mode: randomness is generated here, never during render.
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.1, Math.max(0, (t - last) / 1000));
      last = t;
      const rand = Array.from({ length: RANDS_PER_TICK }, () => Math.random());
      dispatch({ type: "tick", dt, rand });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (running) inputRef.current?.focus();
  }, [running]);

  const onJoinOrCreate = (event: FormEvent) => {
    event.preventDefault();
    if (availability !== "on") return;
    const name = nameInput.replace(/\s+/g, " ").trim();
    if (!name) return setJoinError("Nhập tên của bạn nhé.");
    if (entryTab === "create") {
      void createAndJoin(name);
      return;
    }
    const code = cleanCode(codeInput);
    if (code.length !== 4) return setJoinError("Mã phòng gồm 4 chữ cái, xem trên màn hình lớn nhé.");
    void join(code, name);
  };

  const onHostSettings = (next: RoomSettings) => {
    setHostSettings(next);
    if (session && isHost && room?.status === "lobby") {
      updateRoomSettings(session.code, next).catch(() => {});
    }
  };

  const onHostStart = async () => {
    if (!session || !room || !isHost) return;
    setHostBusy(true);
    setHostError(null);
    try {
      endingRound.current = null;
      await startRound(session.code, room, hostSettings);
    } catch (e) {
      setHostError(errorText(e));
    } finally {
      setHostBusy(false);
    }
  };

  const onHostLobby = async () => {
    if (!session || !isHost) return;
    setHostBusy(true);
    setHostError(null);
    try {
      await backToLobby(session.code);
    } catch (e) {
      setHostError(errorText(e));
    } finally {
      setHostBusy(false);
    }
  };

  const onHostClose = async () => {
    if (!session || !isHost) return;
    setHostBusy(true);
    setHostError(null);
    try {
      await closeRoom(session.code);
      resetToEntry();
    } catch (e) {
      setHostError(errorText(e));
    } finally {
      setHostBusy(false);
    }
  };

  const onLeave = async () => {
    if (!session) return;
    setHostBusy(true);
    try {
      await leaveRoom(session.code, session.uid, room?.status === "lobby");
    } finally {
      setHostBusy(false);
      resetToEntry();
    }
  };

  const onCopyLink = () => {
    if (!session) return;
    const url = `${window.location.origin}/party?room=${session.code}`;
    navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {});
  };

  const prevSfx = useRef({
    cleared: engine.cleared,
    lives: engine.lives,
    bosses: engine.bossesDefeated,
    errors: engine.errorTick,
    status: engine.status,
  });
  useEffect(() => {
    const p = prevSfx.current;
    if (engine.status === "playing") {
      if (engine.bossesDefeated > p.bosses) playBossDefeat();
      else if (engine.lives > p.lives && p.status === "playing") playHeart();
      else if (engine.cleared > p.cleared) playSuccess(engine.combo);
      else if (engine.lives < p.lives || engine.errorTick > p.errors) playError();
    } else if (engine.status === "over" && p.status === "playing") {
      playGameOver(false);
    }
    prevSfx.current = {
      cleared: engine.cleared,
      lives: engine.lives,
      bosses: engine.bossesDefeated,
      errors: engine.errorTick,
      status: engine.status,
    };
  }, [engine.cleared, engine.lives, engine.bossesDefeated, engine.errorTick, engine.status, engine.combo]);

  const pending = running ? pendingExact(engine) : undefined;
  const shake = engine.errorTick === 0 ? "" : engine.errorTick % 2 ? "shake-a" : "shake-b";
  const total = room ? participants(room).length : 0;
  const alive = room ? aliveCount(room, now) : 0;
  const myRank = room && session ? rankPlayers(room, now).indexOf(session.uid) + 1 : 0;

  let overlay: ReactNode = null;
  if (availability === "off" || availability === "error") overlay = <AvailabilityNotice availability={availability} />;
  else if (!session)
    overlay = (
      <JoinForm
        tab={entryTab}
        code={codeInput}
        name={nameInput}
        joining={joining}
        error={joinError}
        onTab={(t) => {
          setEntryTab(t);
          setJoinError(null);
        }}
        onCode={(v) => setCodeInput(cleanCode(v))}
        onName={setNameInput}
        onSubmit={onJoinOrCreate}
      />
    );
  else if (room === undefined) overlay = <Notice title="Đang vào phòng…" />;
  else if (room === null)
    overlay = (
      <Notice title="Phòng không còn nữa">
        <p className="muted small">Phòng {session.code} đã đóng. Bạn có thể vào phòng khác hoặc tạo phòng mới.</p>
        <button type="button" className="btn primary" onClick={resetToEntry}>
          Quay lại
        </button>
      </Notice>
    );
  else if (room.status === "lobby")
    overlay = (
      <Lobby
        room={room}
        session={session}
        isHost={isHost}
        qr={qr}
        copied={copied}
        settings={hostSettings}
        busy={hostBusy}
        error={hostError}
        onCopyLink={onCopyLink}
        onSettings={onHostSettings}
        onStart={() => void onHostStart()}
        onClose={() => void onHostClose()}
        onLeave={() => void onLeave()}
      />
    );
  else if (room.status === "ended")
    overlay = (
      <Ended
        room={room}
        session={session}
        isHost={isHost}
        busy={hostBusy}
        error={hostError}
        onLobby={() => void onHostLobby()}
        onClose={() => void onHostClose()}
        onLeave={() => void onLeave()}
      />
    );
  else if (!inRound)
    overlay = (
      <Notice title="Vòng đang chạy, chờ vòng sau nhé">
        <p className="muted small">
          Còn {alive}/{total} người đang trụ. Bạn sẽ được vào ngay khi host bắt đầu vòng mới.
        </p>
        <button type="button" className="btn btn-sm" disabled={hostBusy} onClick={() => void onLeave()}>
          Rời phòng
        </button>
      </Notice>
    );
  else if (out)
    overlay = (
      <Out
        room={room}
        session={session}
        now={now}
        engine={engine}
        forfeited={forfeited && engine.status !== "over"}
        alive={alive}
        isHost={isHost}
        onEndNow={() => void finishAsHost(room)}
      />
    );
  else if (timeUp)
    overlay = (
      <Notice title="Hết giờ!">
        <p className="final-score">{engine.score.toLocaleString("vi-VN")}</p>
        <p className="muted small">Bạn trụ tới cuối vòng. Chờ host công bố kết quả nhé…</p>
      </Notice>
    );

  return (
    <div ref={rootRef} className="game party-phone">
      <header className="hud party-hud">
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/icons/logo.webp" alt="Keep Me Away From IELTS" width={30} height={30} className="brand-icon" loading="eager" unoptimized />
            <span>Party Mode</span>
          </div>
        </div>
        {inRound && room?.status === "playing" ? (
          <dl className="hud-stats">
            <div>
              <dt>Điểm</dt>
              <dd>{engine.score.toLocaleString("vi-VN")}</dd>
            </div>
            <div>
              <dt>Mạng</dt>
              <dd className="lives" aria-label={`Còn ${engine.lives} mạng`}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <span key={i} className={i < engine.lives ? "heart" : "heart lost"} aria-hidden>
                    ♥
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>Hạng</dt>
              <dd className={myRank === 1 ? "hot" : undefined}>{myRank > 0 ? `#${myRank}` : "–"}</dd>
            </div>
            <div>
              <dt>Còn</dt>
              <dd>
                {alive}/{total}
              </dd>
            </div>
            <div>
              <dt>Thời gian</dt>
              <dd>
                {room.endsAt === 0
                  ? countdown
                    ? "∞"
                    : formatElapsed(Math.max(0, now - room.startAt))
                  : formatClock(room.endsAt - Math.max(now, room.startAt))}
              </dd>
            </div>
          </dl>
        ) : (
          <span className="muted small party-hud-note">{session ? `Phòng ${session.code} · ${session.name}` : "Party"}</span>
        )}
        <SoundToggle />
      </header>

      <main className="field">
        <Lane state={engine} showMeaning />

        <div className="typing">
          {pending && (
            <p className="pending">
              <kbd>Enter</kbd> để chốt “{pending.text}”, hoặc gõ tiếp
            </p>
          )}
          <div className={`input-wrap ${shake}`}>
            <input
              ref={inputRef}
              className="type-input"
              value={engine.typed}
              onChange={(e) => {
                if (e.target.value.length > engine.typed.length) playKey();
                dispatch({ type: "input", value: e.target.value });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  dispatch({ type: "submit" });
                }
              }}
              disabled={!canType}
              placeholder={running ? "Gõ từ đang rơi…" : "Chạm vào đây để mở bàn phím"}
              aria-label="Ô gõ từ"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
            />
          </div>
        </div>

        {countdown && room && (
          <div className="party-countdown" aria-live="polite">
            <span className="party-countdown-label">
              {settingsLabel(room.settings.mode, room.settings.difficulty, room.settings.durationMin)}
            </span>
            <strong>{Math.max(1, Math.ceil((room.startAt - now) / 1000))}</strong>
            <span className="party-countdown-label">Chạm vào ô gõ bên dưới để mở bàn phím</span>
          </div>
        )}
        {overlay}
      </main>
    </div>
  );
}

function JoinForm(props: {
  tab: "join" | "create";
  code: string;
  name: string;
  joining: boolean;
  error: string | null;
  onTab: (tab: "join" | "create") => void;
  onCode: (value: string) => void;
  onName: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="overlay">
      <form className="card party-join" onSubmit={props.onSubmit}>
        <div className="menu-hero">
          <Image src="/icons/party.webp" alt="" width={58} height={58} className="menu-hero-icon" priority unoptimized />
          <h1 className="title">
            Keep Me Away From <span className="accent">IELTS</span> · Party
          </h1>
        </div>
        <div className="segmented segmented-2 party-tabs" role="tablist" aria-label="Vào phòng hoặc tạo phòng">
          <button
            type="button"
            role="tab"
            aria-selected={props.tab === "join"}
            className={props.tab === "join" ? "selected" : undefined}
            onClick={() => props.onTab("join")}
          >
            Vào phòng
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.tab === "create"}
            className={props.tab === "create" ? "selected" : undefined}
            onClick={() => props.onTab("create")}
          >
            Tạo phòng
          </button>
        </div>
        <p className="muted small">
          {props.tab === "join"
            ? "Cùng nhau gõ từ rơi. Để rơi 5 từ là bị loại, người trụ lại cuối cùng thắng!"
            : "Tạo phòng riêng (tối đa 30 người) — không cần mã PIN, bạn vừa điều khiển phòng vừa cùng chơi!"}
        </p>
        {props.tab === "join" && (
          <label className="party-field">
            <span>Mã phòng</span>
            <input
              className="type-input party-code-input"
              value={props.code}
              onChange={(e) => props.onCode(e.target.value)}
              placeholder="ABCD"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              maxLength={4}
            />
          </label>
        )}
        <label className="party-field">
          <span>Tên của bạn</span>
          <input
            className="type-input"
            value={props.name}
            onChange={(e) => props.onName(e.target.value)}
            placeholder="Tối đa 16 ký tự"
            autoComplete="nickname"
            maxLength={MAX_NAME}
            enterKeyHint="go"
          />
        </label>
        {props.error && <p className="party-error">{props.error}</p>}
        <button type="submit" className="btn primary big" disabled={props.joining}>
          {props.tab === "create"
            ? props.joining
              ? "Đang tạo phòng…"
              : "Tạo phòng mới"
            : props.joining
              ? "Đang vào…"
              : "Vào phòng"}
        </button>
        <p className="muted tiny">
          <Link href="/">← Quay lại Chơi đơn</Link>
        </p>
      </form>
    </div>
  );
}

function Lobby(props: {
  room: Room;
  session: Session;
  isHost: boolean;
  qr: string;
  copied: boolean;
  settings: RoomSettings;
  busy: boolean;
  error: string | null;
  onCopyLink: () => void;
  onSettings: (settings: RoomSettings) => void;
  onStart: () => void;
  onClose: () => void;
  onLeave: () => void;
}) {
  const { room, session, isHost } = props;
  const players = Object.entries(room.players)
    .filter(([, p]) => p.connected)
    .sort(([, a], [, b]) => a.joinedAt - b.joinedAt);

  if (isHost) {
    return (
      <div className="overlay">
        <div className="card party-lobby-card">
          <section className="party-lobby-left">
            <h2>Phòng của bạn</h2>
            <div className="party-share-row">
              {props.qr && (
                <div
                  className="party-qr party-player-host-qr"
                  aria-label={`Mã QR vào phòng ${session.code}`}
                  dangerouslySetInnerHTML={{ __html: props.qr }}
                />
              )}
              <div className="party-share-info">
                <span className="muted tiny">MÃ PHÒNG</span>
                <strong className="party-share-code">{session.code}</strong>
                <button type="button" className="btn btn-sm" onClick={props.onCopyLink}>
                  {props.copied ? "Đã sao chép link!" : "Sao chép link mời"}
                </button>
              </div>
            </div>
            <p className="muted small">
              {players.length} người trong phòng <span className="tiny">(tối đa 30)</span>
            </p>
            <ul className="party-names">
              {players.map(([uid, p]) => (
                <li key={uid} className={uid === session.uid ? "me" : undefined}>
                  {p.name}
                </li>
              ))}
            </ul>
          </section>
          <section className="party-lobby-right">
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
            {props.error && <p className="party-error">{props.error}</p>}
            <div className="actions">
              <button
                type="button"
                className="btn primary big"
                disabled={players.length === 0 || props.busy}
                onClick={props.onStart}
              >
                Bắt đầu
              </button>
              <button type="button" className="btn btn-danger" disabled={props.busy} onClick={props.onClose}>
                Đóng phòng
              </button>
            </div>
            <p className="muted tiny">
              {props.settings.durationMin === LAST_SURVIVOR_DURATION
                ? "Không giới hạn thời gian · để rơi 5 từ là bị loại · chơi tới người trụ lại cuối cùng."
                : `Vòng tối đa ${props.settings.durationMin} phút · để rơi 5 từ là bị loại · chấm band theo mẫu miễn phí.`}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <Notice title="Chờ host bắt đầu…">
      <p className="muted small">
        Phòng <strong className="accent">{session.code}</strong> · {players.length} người trong phòng ·{" "}
        {settingsLabel(room.settings.mode, room.settings.difficulty, room.settings.durationMin)}
      </p>
      <ul className="party-names">
        {players.map(([uid, p]) => (
          <li key={uid} className={uid === session.uid ? "me" : undefined}>
            {p.name}
          </li>
        ))}
      </ul>
      <p className="muted tiny">
        {room.settings.durationMin === LAST_SURVIVOR_DURATION
          ? "Không giới hạn thời gian — chơi tới người trụ lại cuối cùng. Không tạm dừng được, nên giữ màn hình luôn mở nhé."
          : `Vòng chơi tối đa ${room.settings.durationMin} phút. Không tạm dừng được, nên giữ màn hình luôn mở nhé.`}
      </p>
      <button type="button" className="btn btn-sm" disabled={props.busy} onClick={props.onLeave}>
        Rời phòng
      </button>
    </Notice>
  );
}

function Out(props: {
  room: Room;
  session: Session;
  now: number;
  engine: GameState;
  forfeited: boolean;
  alive: number;
  isHost: boolean;
  onEndNow: () => void;
}) {
  const { room, session, engine } = props;
  const ranking = rankPlayers(room, props.now);
  const rank = ranking.indexOf(session.uid) + 1;
  const me = room.players[session.uid];
  const score = props.forfeited ? (me?.score ?? 0) : engine.score;
  return (
    <Notice title={props.forfeited ? "Bạn đã rời vòng quá lâu" : "Bạn bị loại rồi"}>
      <p className="party-rank">
        Bạn hạng {rank || "?"}/{ranking.length} · {score.toLocaleString("vi-VN")} điểm
      </p>
      <p className="muted small party-live">
        {props.alive > 0 ? `Còn ${props.alive} người đang trụ…` : "Đang tổng kết vòng…"}
      </p>
      {props.isHost && props.alive > 0 && (
        <button type="button" className="btn btn-sm" onClick={props.onEndNow}>
          Kết thúc vòng ngay
        </button>
      )}
    </Notice>
  );
}

function Ended(props: {
  room: Room;
  session: Session;
  isHost: boolean;
  busy: boolean;
  error: string | null;
  onLobby: () => void;
  onClose: () => void;
  onLeave: () => void;
}) {
  const { room, session, isHost } = props;
  const results = room.results;
  const ranking = results?.ranking ?? [];
  const rank = ranking.indexOf(session.uid) + 1;
  const card = results?.cards.find((c) => c.uid === session.uid);
  const me = room.players[session.uid];
  return (
    <Notice title={rank === 1 ? "Bạn thắng rồi! 🏆" : rank > 0 ? `Bạn hạng ${rank}/${ranking.length}` : "Vòng vừa kết thúc"}>
      {rank === 1 && (
        <Image src="/icons/trophy.webp" alt="" width={72} height={72} className="result-hero-icon" unoptimized />
      )}
      {rank > 0 && me && <p className="final-score">{me.score.toLocaleString("vi-VN")}</p>}
      {card && (
        <div className="band-card">
          <span className="band-label">Band</span>
          <strong className="band-value">{card.band}</strong>
          <p>{card.comment}</p>
        </div>
      )}
      {ranking.length > 0 && (
        <ol className="party-podium">
          {ranking.slice(0, 3).map((uid, i) => (
            <li key={uid} className={uid === session.uid ? "me" : undefined}>
              <span className="podium-place">{["🥇", "🥈", "🥉"][i]}</span>
              <span className="podium-name">{room.players[uid]?.name ?? "?"}</span>
              <span className="podium-score">{(room.players[uid]?.score ?? 0).toLocaleString("vi-VN")}</span>
            </li>
          ))}
        </ol>
      )}
      {props.error && <p className="party-error">{props.error}</p>}
      {isHost ? (
        <div className="actions">
          <button type="button" className="btn primary" disabled={props.busy} onClick={props.onLobby}>
            Vòng mới
          </button>
          <button type="button" className="btn btn-danger" disabled={props.busy} onClick={props.onClose}>
            Đóng phòng
          </button>
        </div>
      ) : (
        <>
          <p className="muted small">{rank > 0 ? "Chờ host mở vòng mới nhé!" : "Bạn sẽ được vào vòng sau. Chờ host nhé!"}</p>
          <button type="button" className="btn btn-sm" disabled={props.busy} onClick={props.onLeave}>
            Rời phòng
          </button>
        </>
      )}
    </Notice>
  );
}
