"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useBestScores } from "@/hooks/useBestScore";
import { PHRASES, WORDS } from "@/lib/vocab";
import {
  BOSS_EVERY,
  DIFFICULTIES,
  LIVES,
  RANDS_PER_TICK,
  WORDS_PER_MAP,
  buildPool,
  initialState,
  isBossMap,
  pendingExact,
  reducer,
  stats,
  type Difficulty,
  type GameState,
  type Mode,
} from "@/lib/typing-engine";
import { Lane } from "@/components/Lane";

const MODES: Record<Mode, { label: string; detail: string }> = {
  words: { label: "Từ đơn", detail: `${WORDS.length.toLocaleString("vi-VN")} từ hay gặp nhất trong đề IELTS` },
  phrases: { label: "Cụm từ", detail: `${PHRASES.length} cụm từ hay gặp trong Reading và Listening` },
};

const BEST_KEY = "kmafi:best:v1";
const BEST_EVENT = "kmafi:best";
const bestKey = (mode: Mode, difficulty: Difficulty) => `${mode}:${difficulty}`;

function parseMode(raw: string | null): Mode {
  return raw === "phrases" ? "phrases" : "words";
}

function parseDifficulty(raw: string | null): Difficulty {
  return raw === "normal" || raw === "hard" ? raw : "easy";
}

export default function TypingGame() {
  const searchParams = useSearchParams();
  const initialMode = parseMode(searchParams.get("mode"));
  const initialDifficulty = parseDifficulty(searchParams.get("difficulty"));
  const initialMeaning = searchParams.get("meaning") !== "0";
  const shouldAutoStart = searchParams.get("autostart") === "1";

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...initialState(),
    mode: initialMode,
    difficulty: initialDifficulty,
  }));
  const [showMeaning, setShowMeaning] = useState(initialMeaning);
  const inputRef = useRef<HTMLInputElement>(null);
  const overAt = useRef(0);
  const autoStarted = useRef(false);

  const { scores: bestScores, saveScore } = useBestScores(BEST_KEY, BEST_EVENT);
  const { status, mode, difficulty } = state;
  const best = bestScores[bestKey(mode, difficulty)] ?? 0;

  const start = useCallback(
    (m: Mode = mode, d: Difficulty = difficulty) => {
      const b = bestScores[bestKey(m, d)] ?? 0;
      dispatch({ type: "start", pool: buildPool(m, d, WORDS, PHRASES), best: b, mode: m, difficulty: d });
    },
    [mode, difficulty, bestScores],
  );

  // Auto-start when launched from the main Hub with ?autostart=1
  useEffect(() => {
    if (!shouldAutoStart || autoStarted.current) return;
    autoStarted.current = true;
    start(initialMode, initialDifficulty);
  }, [shouldAutoStart, initialMode, initialDifficulty, start]);

  // Game loop: only runs while playing. Randomness is generated here, never during render.
  useEffect(() => {
    if (status !== "playing") return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const rand = Array.from({ length: RANDS_PER_TICK }, () => Math.random());
      dispatch({ type: "tick", dt, rand });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  // Keep the input focused during play and pause if the tab goes into the background.
  useEffect(() => {
    if (status === "playing") inputRef.current?.focus();
    const onHide = () => {
      if (document.hidden && status === "playing") dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [status]);

  // Persist best score whenever a run ends.
  useEffect(() => {
    if (status !== "over") return;
    overAt.current = performance.now();
    saveScore(bestKey(state.mode, state.difficulty), state.score);
  }, [status, state.mode, state.difficulty, state.score, saveScore]);

  // Keyboard shortcuts: Escape pauses/resumes; Enter starts/continues/resumes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (status === "playing") dispatch({ type: "pause" });
        else if (status === "paused") dispatch({ type: "resume" });
        return;
      }
      if (event.repeat || event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
      if (status === "menu" && event.key === "Enter") {
        event.preventDefault();
        start();
      } else if (status === "over" && event.key === "Enter") {
        if (performance.now() - overAt.current < 450) return;
        event.preventDefault();
        dispatch({ type: "continue" });
      } else if (status === "paused" && event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "resume" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, start]);

  const pending = pendingExact(state);
  const { wpm, accuracy } = stats(state);
  const bossMap = isBossMap(state.map);
  const shake = state.errorTick === 0 ? "" : state.errorTick % 2 ? "shake-a" : "shake-b";

  return (
    <div className="game">
      <header className="hud">
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/logo.png" alt="Keep Me Away From IELTS" width={30} height={30} className="brand-icon" unoptimized />
            <span>Gõ từ rơi</span>
          </div>
        </div>
        {status !== "menu" && (
          <>
            <dl className="hud-stats">
              <div>
                <dt>Điểm</dt>
                <dd>{state.score.toLocaleString("vi-VN")}</dd>
              </div>
              <div>
                <dt>Map</dt>
                <dd className={bossMap ? "boss-map" : undefined}>
                  {state.map}
                  <span className="map-progress">{bossMap ? " BOSS" : ` ${state.mapProgress}/${WORDS_PER_MAP}`}</span>
                </dd>
              </div>
              <div>
                <dt>Combo</dt>
                <dd className={state.combo >= 5 ? "hot" : undefined}>x{state.combo}</dd>
              </div>
              <div>
                <dt>Mạng</dt>
                <dd className="lives" aria-label={`Còn ${state.lives} mạng`}>
                  {Array.from({ length: LIVES }, (_, i) => (
                    <span key={i} className={i < state.lives ? "heart" : "heart lost"} aria-hidden>
                      ♥
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="hud-pause"
              onClick={() => dispatch({ type: status === "paused" ? "resume" : "pause" })}
              disabled={status !== "playing" && status !== "paused"}
            >
              {status === "paused" ? "Tiếp tục" : "Tạm dừng"}
            </button>
          </>
        )}
      </header>

      <main className="field">
        <Lane state={state} showMeaning={showMeaning} />

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
              value={state.typed}
              onChange={(e) => dispatch({ type: "input", value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  dispatch({ type: "submit" });
                }
              }}
              disabled={status !== "playing"}
              placeholder="Gõ từ đang rơi…"
              aria-label="Ô gõ từ"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
            />
          </div>
        </div>

        {status === "menu" && (
          <div className="overlay">
            <div className="card">
              <div className="menu-hero">
                <Image src="/icons/solo.png" alt="" width={58} height={58} className="menu-hero-icon" unoptimized />
                <div>
                  <h1 className="title">Gõ từ rơi IELTS</h1>
                  <p className="muted tiny">
                    Gõ từ trước khi chạm đất · Để rơi {LIVES} từ là thua · Boss mỗi {BOSS_EVERY} map
                  </p>
                </div>
              </div>

              <fieldset className="choice">
                <legend>Chế độ</legend>
                <div className="mode-grid">
                  {(Object.keys(MODES) as Mode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={m === mode ? "mode selected" : "mode"}
                      aria-pressed={m === mode}
                      onClick={() => dispatch({ type: "setMode", mode: m })}
                    >
                      <strong>{MODES[m].label}</strong>
                      <span>{MODES[m].detail}</span>
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
                      className={d === difficulty ? "selected" : undefined}
                      aria-pressed={d === difficulty}
                      onClick={() => dispatch({ type: "setDifficulty", difficulty: d })}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="switch">
                <input type="checkbox" checked={showMeaning} onChange={(e) => setShowMeaning(e.target.checked)} />
                <span>Hiện nghĩa tiếng Việt dưới từ đang rơi</span>
              </label>

              <button type="button" className="btn primary big" onClick={() => start()}>
                Bắt đầu <kbd>Enter</kbd>
              </button>

              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Kho game</Link> · Muốn đấu cùng bạn bè? <Link href="/party">Mở Party Mode</Link>
              </p>
            </div>
          </div>
        )}

        {status === "paused" && (
          <div className="overlay">
            <div className="card card-small">
              <h2>Tạm dừng</h2>
              <p className="muted">Nhấn Esc hoặc Enter để chơi tiếp.</p>
              <div className="actions">
                <button type="button" className="btn primary" onClick={() => dispatch({ type: "resume" })}>
                  Tiếp tục
                </button>
                <button type="button" className="btn" onClick={() => dispatch({ type: "menu" })}>
                  Đổi độ khó
                </button>
              </div>
              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Kho game</Link>
              </p>
            </div>
          </div>
        )}

        {status === "over" && (
          <GameOver
            state={state}
            best={Math.max(best, state.score)}
            wpm={wpm}
            accuracy={accuracy}
            onContinue={() => dispatch({ type: "continue" })}
            onRestart={() => start()}
            onMenu={() => dispatch({ type: "menu" })}
          />
        )}
      </main>
    </div>
  );
}

function GameOver(props: {
  state: GameState;
  best: number;
  wpm: number;
  accuracy: number;
  onContinue: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const { state } = props;
  const newRecord = state.score > 0 && state.score > state.bestAtStart;
  return (
    <div className="overlay">
      <div className="card over-card">
        <div className="over-head">
          <Image
            src={newRecord ? "/icons/trophy.png" : "/icons/mascot.png"}
            alt=""
            width={60}
            height={60}
            className="over-icon"
            unoptimized
          />
          <div className="over-head-info">
            <h2>{newRecord ? "Kỷ lục mới!" : "Hết mạng rồi"}</h2>
            <p className="final-score">{state.score.toLocaleString("vi-VN")}</p>
            <p className="muted small">
              Kỷ lục: {props.best.toLocaleString("vi-VN")}
              {state.continues > 0 && ` · Đã hồi sinh ${state.continues} lần`}
            </p>
          </div>
        </div>
        <dl className="summary">
          <div>
            <dt>Đã gõ</dt>
            <dd>{state.cleared}</dd>
          </div>
          <div>
            <dt>Tốc độ</dt>
            <dd>{props.wpm} WPM</dd>
          </div>
          <div>
            <dt>Chính xác</dt>
            <dd>{props.accuracy}%</dd>
          </div>
          <div>
            <dt>Combo max</dt>
            <dd>x{state.maxCombo}</dd>
          </div>
          <div>
            <dt>Map</dt>
            <dd>{state.map}</dd>
          </div>
          <div>
            <dt>Boss hạ</dt>
            <dd>{state.bossesDefeated}</dd>
          </div>
        </dl>
        <button type="button" className="btn primary big" onClick={props.onContinue}>
          Chơi tiếp, bơm đầy <span className="heart-inline">♥</span> <kbd>Enter</kbd>
        </button>
        <div className="actions">
          <button type="button" className="btn" onClick={props.onRestart}>
            Chơi lại
          </button>
          <button type="button" className="btn" onClick={props.onMenu}>
            Đổi độ khó
          </button>
          <Link href="/" className="btn">
            ← Kho game
          </Link>
        </div>
      </div>
    </div>
  );
}
