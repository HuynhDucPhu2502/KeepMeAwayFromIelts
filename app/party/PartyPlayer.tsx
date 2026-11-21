"use client";

// Phone view for party mode: join a room, wait in the lobby, play the round locally, see the result.
// The game itself runs entirely on this phone; only the score, lives and alive flag go to Firebase.
import { useCallback, useEffect, useReducer, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import wordsData from "@/data/words.json";
import phrasesData from "@/data/phrases.json";
import {
  LIVES,
  RANDS_PER_TICK,
  initialState,
  partyPool,
  pendingExact,
  reducer,
  stats,
  type Entry,
  type GameState,
} from "../game/engine";
import { Lane } from "../game/Lane";
import {
  DISCONNECT_GRACE_MS,
  MAX_NAME,
  aliveCount,
  ensureSignedIn,
  freshRoundState,
  joinRoom,
  participants,
  publishPlayer,
  rankPlayers,
  serverNow,
  shouldEnroll,
  subscribeRoom,
  type PlayerState,
  type Room,
} from "./room";
import { AvailabilityNotice, Notice, errorText, formatClock, settingsLabel, usePartyAvailability } from "./common";

const WORDS = wordsData as Entry[];
const PHRASES = phrasesData as Entry[];
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

export default function PartyPlayer() {
  const availability = usePartyAvailability();
  const params = useSearchParams();
  const [codeInput, setCodeInput] = useState(() => cleanCode(params.get("room") ?? ""));
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [now, setNow] = useState(0);
  const [control, setControl] = useState<Control>({ localRound: null, startedRound: null, forfeitRound: null });
  const [engine, dispatch] = useReducer(reducer, undefined, () => initialState("words", "easy"));

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const roomRef = useRef<Room | null | undefined>(undefined);
  const engineRef = useRef<GameState>(engine);
  const controlRef = useRef<Control>(control);
  const publishState = useRef({ at: 0, sig: "", eliminatedAt: null as number | null, enrolling: -1 });
  const hiddenAt = useRef<number | null>(null);

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
      if (result === "missing") setJoinError(`Không tìm thấy phòng ${code}. Kiểm tra lại mã trên màn hình lớn nhé.`);
      else if (result === "full") setJoinError("Phòng đã đủ 30 người rồi, chờ lượt sau nhé.");
      else {
        writeSaved(code, name);
        setSession({ code, uid, name });
      }
    } catch (error) {
      setJoinError(errorText(error));
    } finally {
      setJoining(false);
    }
  }, []);

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
    return subscribeRoom(session.code, (next) => {
      roomRef.current = next;
    });
  }, [session]);

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

      if (ctl.startedRound !== r.round && t >= r.startAt && t < r.endsAt) {
        ps.sig = "";
        ps.eliminatedAt = null;
        const { mode, difficulty } = r.settings;
        dispatch({
          type: "start",
          pool: partyPool(mode, difficulty, WORDS, PHRASES),
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
  const timeUp = !!room && room.status === "playing" && now >= room.endsAt;
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

  const onJoin = (event: FormEvent) => {
    event.preventDefault();
    const code = cleanCode(codeInput);
    const name = nameInput.replace(/\s+/g, " ").trim();
    if (code.length !== 4) return setJoinError("Mã phòng gồm 4 chữ cái, xem trên màn hình lớn nhé.");
    if (!name) return setJoinError("Nhập tên của bạn nhé.");
    void join(code, name);
  };

  const pending = running ? pendingExact(engine) : undefined;
  const shake = engine.errorTick === 0 ? "" : engine.errorTick % 2 ? "shake-a" : "shake-b";
  const total = room ? participants(room).length : 0;
  const alive = room ? aliveCount(room, now) : 0;

  let overlay: ReactNode = null;
  if (availability !== "on") overlay = <AvailabilityNotice availability={availability} />;
  else if (!session)
    overlay = (
      <JoinForm
        code={codeInput}
        name={nameInput}
        joining={joining}
        error={joinError}
        onCode={(v) => setCodeInput(cleanCode(v))}
        onName={setNameInput}
        onSubmit={onJoin}
      />
    );
  else if (room === undefined) overlay = <Notice title="Đang vào phòng…" />;
  else if (room === null)
    overlay = (
      <Notice title="Phòng không còn nữa">
        <p className="muted small">Phòng {session.code} đã đóng. Quét lại mã QR trên màn hình lớn nhé.</p>
      </Notice>
    );
  else if (room.status === "lobby") overlay = <Lobby room={room} session={session} />;
  else if (room.status === "ended") overlay = <Ended room={room} session={session} />;
  else if (!inRound)
    overlay = (
      <Notice title="Vòng đang chạy, chờ vòng sau nhé">
        <p className="muted small">
          Còn {alive}/{total} người đang trụ. Bạn sẽ được vào ngay khi host bắt đầu vòng mới.
        </p>
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
        <div className="hud-brand">Keep Me Away From IELTS · Party</div>
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
              <dt>Còn</dt>
              <dd>
                {alive}/{total}
              </dd>
            </div>
            <div>
              <dt>Thời gian</dt>
              <dd>{formatClock(room.endsAt - Math.max(now, room.startAt))}</dd>
            </div>
          </dl>
        ) : (
          <span className="muted small party-hud-note">{session ? `Phòng ${session.code} · ${session.name}` : "Party"}</span>
        )}
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
              onChange={(e) => dispatch({ type: "input", value: e.target.value })}
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
            <span className="party-countdown-label">{settingsLabel(room.settings.mode, room.settings.difficulty)}</span>
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
  code: string;
  name: string;
  joining: boolean;
  error: string | null;
  onCode: (value: string) => void;
  onName: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="overlay">
      <form className="card party-join" onSubmit={props.onSubmit}>
        <h1 className="title">
          Keep Me Away From <span className="accent">IELTS</span> · Party
        </h1>
        <p className="muted small">Cả booth cùng chơi một vòng. Để rơi 5 từ là bị loại, người trụ lại cuối cùng thắng!</p>
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
          {props.joining ? "Đang vào…" : "Vào phòng"}
        </button>
      </form>
    </div>
  );
}

function Lobby({ room, session }: { room: Room; session: Session }) {
  const players = Object.entries(room.players)
    .filter(([, p]) => p.connected)
    .sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  return (
    <Notice title="Chờ host bắt đầu…">
      <p className="muted small">
        Phòng <strong className="accent">{session.code}</strong> · {players.length} người trong phòng ·{" "}
        {settingsLabel(room.settings.mode, room.settings.difficulty)}
      </p>
      <ul className="party-names">
        {players.map(([uid, p]) => (
          <li key={uid} className={uid === session.uid ? "me" : undefined}>
            {p.name}
          </li>
        ))}
      </ul>
      <p className="muted tiny">Vòng chơi tối đa 3 phút. Không tạm dừng được, nên giữ màn hình luôn mở nhé.</p>
    </Notice>
  );
}

function Out(props: { room: Room; session: Session; now: number; engine: GameState; forfeited: boolean; alive: number }) {
  const { room, session, engine } = props;
  const ranking = rankPlayers(room, props.now);
  const rank = ranking.indexOf(session.uid) + 1;
  const me = room.players[session.uid];
  const score = props.forfeited ? (me?.score ?? 0) : engine.score;
  const missed: Entry[] = props.forfeited ? (me?.missed ?? []).map((text) => ({ text })) : engine.missed;
  return (
    <Notice title={props.forfeited ? "Bạn đã rời vòng quá lâu" : "Bạn bị loại rồi"}>
      <p className="party-rank">
        Bạn hạng {rank || "?"}/{ranking.length} · {score.toLocaleString("vi-VN")} điểm
      </p>
      <p className="muted small party-live">
        {props.alive > 0 ? `Còn ${props.alive} người đang trụ…` : "Đang tổng kết vòng…"}
      </p>
      {missed.length > 0 && (
        <div className="missed">
          <h3>Bị rơi, ôn lại nhé</h3>
          <ul>
            {missed.map((m) => (
              <li key={m.text}>
                <span className="missed-word">{m.text}</span>
                {m.meaning && <span className="missed-meaning">{m.meaning}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Notice>
  );
}

function Ended({ room, session }: { room: Room; session: Session }) {
  const results = room.results;
  const ranking = results?.ranking ?? [];
  const rank = ranking.indexOf(session.uid) + 1;
  const card = results?.cards.find((c) => c.uid === session.uid);
  const me = room.players[session.uid];
  return (
    <Notice title={rank === 1 ? "Bạn thắng rồi! 🏆" : rank > 0 ? `Bạn hạng ${rank}/${ranking.length}` : "Vòng vừa kết thúc"}>
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
      <p className="muted small">{rank > 0 ? "Chờ host mở vòng mới nhé!" : "Bạn sẽ được vào vòng sau. Chờ host nhé!"}</p>
    </Notice>
  );
}
