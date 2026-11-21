"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import wordsData from "@/data/words.json";
import phrasesData from "@/data/phrases.json";
import {
  BOSS_EVERY,
  DIFFICULTIES,
  LIVES,
  RANDS_PER_TICK,
  WORDS_PER_MAP,
  activePoolSize,
  buildPool,
  initialState,
  isBossMap,
  pendingExact,
  reducer,
  stats,
  type Difficulty,
  type Entry,
  type GameState,
  type Mode,
} from "./engine";
import { Lane } from "./Lane";

const WORDS = wordsData as Entry[];
const PHRASES = phrasesData as Entry[];

const MODES: Record<Mode, { label: string; detail: string }> = {
  words: { label: "Từ đơn", detail: `${WORDS.length.toLocaleString("vi-VN")} từ hay gặp nhất trong đề IELTS` },
  phrases: { label: "Cụm từ", detail: `${PHRASES.length} cụm từ hay gặp trong Reading và Listening` },
};

// Best scores live in localStorage; useSyncExternalStore keeps the server render and hydration consistent.
const BEST_KEY = "kmafi:best:v1";
const BEST_EVENT = "kmafi:best";

function readBestRaw() {
  try {
    return window.localStorage.getItem(BEST_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeBest(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(BEST_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(BEST_EVENT, callback);
  };
}

function parseBest(raw: string): Record<string, number> {
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? (value as Record<string, number>) : {};
  } catch {
    return {};
  }
}

const bestKey = (mode: Mode, difficulty: Difficulty) => `${mode}:${difficulty}`;

export default function TypingGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const [showMeaning, setShowMeaning] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const overAt = useRef(0);
  const bestRaw = useSyncExternalStore(subscribeBest, readBestRaw, () => "");
  const bestScores = useMemo(() => parseBest(bestRaw), [bestRaw]);
  const { status, mode, difficulty } = state;
  const best = bestScores[bestKey(mode, difficulty)] ?? 0;
  const poolInfo = useMemo(() => {
    const total = buildPool(mode, difficulty, WORDS, PHRASES).length;
    return { total, start: activePoolSize(mode, difficulty, total, 1), perMap: DIFFICULTIES[difficulty][mode].perMap };
  }, [mode, difficulty]);

  const start = useCallback(() => {
    dispatch({ type: "start", pool: buildPool(mode, difficulty, WORDS, PHRASES), best });
  }, [mode, difficulty, best]);

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

  // Pause automatically when the tab or window loses focus.
  useEffect(() => {
    if (status !== "playing") return;
    const pause = () => dispatch({ type: "pause" });
    const onVisibility = () => document.hidden && pause();
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status]);

  useEffect(() => {
    if (status === "playing") inputRef.current?.focus();
  }, [status]);

  // Save a new best score when a run ends.
  useEffect(() => {
    if (status !== "over") return;
    overAt.current = performance.now();
    const scores = parseBest(readBestRaw());
    const key = bestKey(mode, difficulty);
    if (state.score > (scores[key] ?? 0)) {
      scores[key] = state.score;
      try {
        window.localStorage.setItem(BEST_KEY, JSON.stringify(scores));
      } catch {
        // Storage unavailable (private mode): the score just isn't remembered.
      }
      window.dispatchEvent(new Event(BEST_EVENT));
    }
  }, [status, mode, difficulty, state.score]);

  // Keyboard shortcuts. Esc is handled only here: React re-runs effects before a key event
  // finishes bubbling, so a second Esc handler on the input would pause and resume at once.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (status === "playing" || status === "paused")) {
        event.preventDefault();
        dispatch({ type: status === "playing" ? "pause" : "resume" });
      } else if (status === "menu" || status === "over") {
        if (event.key !== "Enter") return;
        // Ignore an Enter that was meant for the last word of the finished run.
        if (status === "over" && performance.now() - overAt.current < 900) return;
        event.preventDefault();
        if (status === "over") dispatch({ type: "continue" });
        else start();
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
        <div className="hud-brand">Keep Me Away From IELTS</div>
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
          <Menu
            mode={mode}
            difficulty={difficulty}
            best={best}
            pool={poolInfo}
            showMeaning={showMeaning}
            onMode={(m) => dispatch({ type: "setMode", mode: m })}
            onDifficulty={(d) => dispatch({ type: "setDifficulty", difficulty: d })}
            onToggleMeaning={setShowMeaning}
            onStart={start}
          />
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
                  Về menu
                </button>
              </div>
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
            onRestart={start}
            onMenu={() => dispatch({ type: "menu" })}
          />
        )}
      </main>
    </div>
  );
}

function Menu(props: {
  mode: Mode;
  difficulty: Difficulty;
  best: number;
  pool: { total: number; start: number; perMap: number };
  showMeaning: boolean;
  onMode: (mode: Mode) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onToggleMeaning: (show: boolean) => void;
  onStart: () => void;
}) {
  return (
    <div className="overlay">
      <div className="card">
        <h1 className="title">
          Keep Me Away From <span className="accent">IELTS</span>
        </h1>
        <p className="muted small">
          Gõ các từ IELTS trước khi chúng chạm đất, để rơi {LIVES} từ là thua. Cứ {BOSS_EVERY} map có một boss. Chữ
          hồng có{" "}
          <span className="heart">♥</span> cho thêm 1 mạng.
        </p>

        <fieldset className="choice">
          <legend>Chế độ</legend>
          <div className="mode-grid">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={m === props.mode ? "mode selected" : "mode"}
                aria-pressed={m === props.mode}
                onClick={() => props.onMode(m)}
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
                className={d === props.difficulty ? "selected" : undefined}
                aria-pressed={d === props.difficulty}
                onClick={() => props.onDifficulty(d)}
              >
                {DIFFICULTIES[d].label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="switch">
          <input
            type="checkbox"
            checked={props.showMeaning}
            onChange={(e) => props.onToggleMeaning(e.target.checked)}
          />
          <span>Hiện nghĩa tiếng Việt dưới từ đang rơi</span>
        </label>

        <button type="button" className="btn primary big" onClick={props.onStart}>
          Bắt đầu <kbd>Enter</kbd>
        </button>

        <p className="muted tiny">
          {props.pool.start.toLocaleString("vi-VN")} {props.mode === "words" ? "từ" : "cụm"}
          {props.pool.start < props.pool.total
            ? ` lúc đầu, mỗi map thêm ${props.pool.perMap} (tối đa ${props.pool.total.toLocaleString("vi-VN")})`
            : ""}{" "}
          · Kỷ lục{" "}
          <strong>{props.best.toLocaleString("vi-VN")}</strong> · <kbd>Esc</kbd> tạm dừng · Dữ liệu:{" "}
          <a href="https://github.com/eugenewang5425/ielts-corpus-lab" target="_blank" rel="noreferrer">
            IELTS Corpus Lab
          </a>
        </p>
      </div>
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
      <div className="card">
        <h2>{newRecord ? "Kỷ lục mới!" : "Hết mạng rồi"}</h2>
        <p className="final-score">{state.score.toLocaleString("vi-VN")}</p>
        <p className="muted small">
          Kỷ lục: {props.best.toLocaleString("vi-VN")}
          {state.continues > 0 && ` · Đã hồi sinh ${state.continues} lần`}
        </p>
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
        {state.missed.length > 0 && (
          <div className="missed">
            <h3>Bị rơi, ôn lại nhé</h3>
            <ul>
              {state.missed.map((m) => (
                <li key={m.text}>
                  <span className="missed-word">{m.text}</span>
                  {m.meaning && <span className="missed-meaning">{m.meaning}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" className="btn primary big" onClick={props.onContinue}>
          Chơi tiếp, bơm đầy <span className="heart-inline">♥</span> <kbd>Enter</kbd>
        </button>
        <div className="actions">
          <button type="button" className="btn" onClick={props.onRestart}>
            Chơi lại từ đầu
          </button>
          <button type="button" className="btn" onClick={props.onMenu}>
            Đổi chế độ
          </button>
        </div>
      </div>
    </div>
  );
}
