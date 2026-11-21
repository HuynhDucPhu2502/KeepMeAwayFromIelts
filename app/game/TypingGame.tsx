"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import wordsData from "@/data/words.json";
import phrasesData from "@/data/phrases.json";
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
  type Entry,
  type GameState,
  type Mode,
} from "./engine";
import { Lane } from "./Lane";
import {
  WRITING_ROUND_COUNTS,
  type WritingMode,
  type WritingRoundCount,
} from "../writing/writing-engine";

const WORDS = wordsData as Entry[];
const PHRASES = phrasesData as Entry[];

const MODES: Record<Mode, { label: string; detail: string }> = {
  words: { label: "Từ đơn", detail: `${WORDS.length.toLocaleString("vi-VN")} từ hay gặp nhất trong đề IELTS` },
  phrases: { label: "Cụm từ", detail: `${PHRASES.length} cụm từ hay gặp trong Reading và Listening` },
};

const WRITING_MODES: Record<WritingMode, { label: string; detail: string }> = {
  task1: { label: "Task 1 · Soi Biểu Đồ", detail: "8 dạng biểu đồ thật: sửa xu hướng, soi số liệu" },
  task2: { label: "Task 2 · Lấp Khung & Xếp Mạch", detail: "6 dạng bài luận: collocation Band 8 & xếp 4 đoạn" },
  mixed: { label: "Tổng hợp (Task 1 + 2)", detail: "Trộn ngẫu nhiên cả biểu đồ lẫn bài luận" },
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

type HubGameId = "solo" | "party" | "writing" | "listening" | "blitz" | "scramble" | "speaking";

export default function TypingGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const [playTab, setPlayTab] = useState<HubGameId>("solo");
  const [showMeaning, setShowMeaning] = useState(true);
  const [writingMode, setWritingMode] = useState<WritingMode>("task1");
  const [writingCount, setWritingCount] = useState<WritingRoundCount>(10);
  const [listenSource, setListenSource] = useState<"words" | "phrases">("words");
  const [listenAccent, setListenAccent] = useState<"en-GB" | "en-US">("en-GB");
  const [listenDiff, setListenDiff] = useState<Difficulty>("easy");
  const [blitzDir, setBlitzDir] = useState<"en-vi" | "vi-en">("en-vi");
  const [blitzDiff, setBlitzDiff] = useState<Difficulty>("easy");
  const [blitzSec, setBlitzSec] = useState<30 | 60 | 90>(60);
  const [scrambleDiff, setScrambleDiff] = useState<Difficulty>("easy");
  const [speakingMode, setSpeakingMode] = useState<"cloze" | "cuecard">("cloze");
  const inputRef = useRef<HTMLInputElement>(null);
  const overAt = useRef(0);
  const bestRaw = useSyncExternalStore(subscribeBest, readBestRaw, () => "");
  const bestScores = useMemo(() => parseBest(bestRaw), [bestRaw]);
  const { status, mode, difficulty } = state;
  const best = bestScores[bestKey(mode, difficulty)] ?? 0;

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
        if (status === "menu" && playTab !== "solo") return;
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
  }, [status, playTab, start]);

  const pending = pendingExact(state);
  const { wpm, accuracy } = stats(state);
  const bossMap = isBossMap(state.map);
  const shake = state.errorTick === 0 ? "" : state.errorTick % 2 ? "shake-a" : "shake-b";

  return (
    <div className="game">
      <header className={status === "menu" ? "hud hud-menu" : "hud"}>
        <div className="hud-brand">
          <Image src="/icons/mascot.png" alt="" width={30} height={30} className="brand-icon" unoptimized />
          <span>Keep Me Away From IELTS</span>
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
          <Menu
            playTab={playTab}
            mode={mode}
            difficulty={difficulty}
            showMeaning={showMeaning}
            writingMode={writingMode}
            writingCount={writingCount}
            listenSource={listenSource}
            listenAccent={listenAccent}
            listenDiff={listenDiff}
            blitzDir={blitzDir}
            blitzDiff={blitzDiff}
            blitzSec={blitzSec}
            scrambleDiff={scrambleDiff}
            speakingMode={speakingMode}
            onPlayTab={setPlayTab}
            onMode={(m) => dispatch({ type: "setMode", mode: m })}
            onDifficulty={(d) => dispatch({ type: "setDifficulty", difficulty: d })}
            onToggleMeaning={setShowMeaning}
            onWritingMode={setWritingMode}
            onWritingCount={setWritingCount}
            onListenSource={setListenSource}
            onListenAccent={setListenAccent}
            onListenDiff={setListenDiff}
            onBlitzDir={setBlitzDir}
            onBlitzDiff={setBlitzDiff}
            onBlitzSec={setBlitzSec}
            onScrambleDiff={setScrambleDiff}
            onSpeakingMode={setSpeakingMode}
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
  playTab: HubGameId;
  mode: Mode;
  difficulty: Difficulty;
  showMeaning: boolean;
  writingMode: WritingMode;
  writingCount: WritingRoundCount;
  listenSource: "words" | "phrases";
  listenAccent: "en-GB" | "en-US";
  listenDiff: Difficulty;
  blitzDir: "en-vi" | "vi-en";
  blitzDiff: Difficulty;
  blitzSec: 30 | 60 | 90;
  scrambleDiff: Difficulty;
  speakingMode: "cloze" | "cuecard";
  onPlayTab: (tab: HubGameId) => void;
  onMode: (mode: Mode) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onToggleMeaning: (show: boolean) => void;
  onWritingMode: (mode: WritingMode) => void;
  onWritingCount: (count: WritingRoundCount) => void;
  onListenSource: (s: "words" | "phrases") => void;
  onListenAccent: (a: "en-GB" | "en-US") => void;
  onListenDiff: (d: Difficulty) => void;
  onBlitzDir: (d: "en-vi" | "vi-en") => void;
  onBlitzDiff: (d: Difficulty) => void;
  onBlitzSec: (s: 30 | 60 | 90) => void;
  onScrambleDiff: (d: Difficulty) => void;
  onSpeakingMode: (m: "cloze" | "cuecard") => void;
  onStart: () => void;
}) {
  const games: { id: HubGameId; icon: string; title: string; subtitle: string; badge: string }[] = [
    {
      id: "solo",
      icon: "/icons/solo.png",
      title: "Gõ từ rơi",
      subtitle: "5.785 từ & 307 cụm · Có Boss mỗi 5 map",
      badge: "Vocab",
    },
    {
      id: "party",
      icon: "/icons/party.png",
      title: "Đấu phòng (Party)",
      subtitle: "2–30 người · Quét QR · Sinh tồn",
      badge: "Party",
    },
    {
      id: "writing",
      icon: "/icons/trophy.png",
      title: "Writing Sprint",
      subtitle: "8 biểu đồ Task 1 · 6 dạng luận Task 2",
      badge: "Writing",
    },
    {
      id: "listening",
      icon: "/icons/listening.png",
      title: "Nghe & Gõ",
      subtitle: "Nghe phát âm UK/US & luyện chính tả",
      badge: "Listening",
    },
    {
      id: "blitz",
      icon: "/icons/blitz.png",
      title: "Nối Nghĩa Tốc Độ",
      subtitle: "60s phản xạ 4 đáp án · Fever x2 điểm",
      badge: "Speed",
    },
    {
      id: "scramble",
      icon: "/icons/scramble.png",
      title: "Xếp Chữ IELTS",
      subtitle: "Ghép chữ cái bị xáo trộn từ nghĩa Việt",
      badge: "Puzzle",
    },
    {
      id: "speaking",
      icon: "/icons/speaking.png",
      title: "Phản Xạ Speaking",
      subtitle: "Cụm nói Part 1–3 & Cue Card 45 giây",
      badge: "Speaking",
    },
  ];

  return (
    <div className="overlay">
      <div className="card hub-card">
        {/* Left: Game library */}
        <section className="hub-library" aria-label="Kho game">
          <div className="menu-hero">
            <Image src="/icons/mascot.png" alt="" width={58} height={58} className="menu-hero-icon" unoptimized />
            <div>
              <h1 className="title">
                Keep Me Away From <span className="accent">IELTS</span>
              </h1>
              <p className="muted tiny">Chọn trò chơi bên dưới rồi tuỳ chỉnh ở khung bên phải</p>
            </div>
          </div>

          <span className="hub-section-label">Kho game ({games.length})</span>
          <div className="hub-game-list" role="tablist" aria-label="Danh sách trò chơi">
            {games.map((g) => {
              const selected = props.playTab === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={selected ? "hub-game-item selected" : "hub-game-item"}
                  onClick={() => props.onPlayTab(g.id)}
                >
                  <Image src={g.icon} alt="" width={40} height={40} className="hub-game-icon" unoptimized />
                  <div className="hub-game-meta">
                    <div className="hub-game-title-row">
                      <strong>{g.title}</strong>
                      <span className="hub-game-badge">{g.badge}</span>
                    </div>
                    <span>{g.subtitle}</span>
                  </div>
                  <span className="hub-game-arrow" aria-hidden>
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: Settings panel for the selected game */}
        <section className="hub-settings" aria-label="Cài đặt trò chơi">
          {props.playTab === "solo" && (
            <>
              <div className="hub-settings-head">
                <h2>Gõ từ rơi · Chơi đơn</h2>
                <p className="muted small">
                  Gõ các từ IELTS trước khi chạm đất, để rơi {LIVES} từ là thua. Cứ {BOSS_EVERY} map có một boss. Chữ
                  hồng có <span className="heart">♥</span> cho thêm 1 mạng.
                </p>
              </div>

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

              <button type="button" className="btn primary big hub-cta" onClick={props.onStart}>
                Bắt đầu <kbd>Enter</kbd>
              </button>
            </>
          )}

          {props.playTab === "party" && (
            <>
              <div className="hub-settings-head">
                <h2>Đấu phòng · Party Battle Royale</h2>
                <p className="muted small">
                  Đấu cùng bạn bè hoặc cả hội trường (tối đa 30 người/phòng). Mọi người nhận cùng thứ tự từ — để rơi{" "}
                  {LIVES} từ là bị loại, người trụ lại cuối cùng thắng!
                </p>
              </div>

              <div className="hub-feature-grid">
                <div className="hub-feature">
                  <strong>Nhiều phòng song song</strong>
                  <span>Tự tạo phòng riêng không cần PIN, chia sẻ bằng mã 4 ký tự hoặc QR.</span>
                </div>
                <div className="hub-feature">
                  <strong>Tuỳ chọn thời gian</strong>
                  <span>3p · 5p · 7p · 10p · 15p · 30p hoặc chơi tới người cuối cùng còn sống.</span>
                </div>
              </div>

              <div className="menu-party-actions hub-cta">
                <Link href="/party?tab=create" className="btn primary big">
                  <Image src="/icons/party.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                  <span>Tạo phòng mới</span>
                </Link>
                <Link href="/party" className="btn big">
                  Vào phòng bằng mã
                </Link>
              </div>

              <p className="muted tiny menu-party-foot">
                Tổ chức trên màn hình lớn / TV? <Link href="/party/host">Mở màn hình Host</Link>
              </p>
            </>
          )}

          {props.playTab === "writing" && (
            <>
              <div className="hub-settings-head">
                <h2>Writing Sprint · Task 1 &amp; 2</h2>
                <p className="muted small">
                  Soi 8 dạng biểu đồ thật Task 1, điền collocation Band 8 và xếp mạch 4 đoạn văn Task 2 — có combo, 5
                  mạng ♥ và chấm Band ước tính.
                </p>
              </div>

              <fieldset className="choice">
                <legend>Chế độ Writing</legend>
                <div className="ws-mode-list">
                  {(Object.keys(WRITING_MODES) as WritingMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={m === props.writingMode ? "mode selected" : "mode"}
                      aria-pressed={m === props.writingMode}
                      onClick={() => props.onWritingMode(m)}
                    >
                      <strong>{WRITING_MODES[m].label}</strong>
                      <span>{WRITING_MODES[m].detail}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="choice">
                <legend>Độ dài lượt chơi</legend>
                <div className="segmented">
                  {WRITING_ROUND_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={n === props.writingCount ? "selected" : undefined}
                      aria-pressed={n === props.writingCount}
                      onClick={() => props.onWritingCount(n)}
                    >
                      {n} câu
                    </button>
                  ))}
                </div>
              </fieldset>

              <Link
                href={`/writing?mode=${props.writingMode}&count=${props.writingCount}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/trophy.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu Writing →</span>
              </Link>
            </>
          )}

          {props.playTab === "listening" && (
            <>
              <div className="hub-settings-head">
                <h2>Nghe &amp; Gõ · IELTS Listening</h2>
                <p className="muted small">
                  Nghe phát âm tiếng Anh (giọng Anh-Anh hoặc Anh-Mỹ) rồi gõ đúng chính tả — báo lỗi chi tiết tới từng
                  ký tự!
                </p>
              </div>

              <fieldset className="choice">
                <legend>Nội dung nghe</legend>
                <div className="segmented segmented-2">
                  <button
                    type="button"
                    className={props.listenSource === "words" ? "selected" : undefined}
                    onClick={() => props.onListenSource("words")}
                  >
                    Từ đơn IELTS
                  </button>
                  <button
                    type="button"
                    className={props.listenSource === "phrases" ? "selected" : undefined}
                    onClick={() => props.onListenSource("phrases")}
                  >
                    Cụm Reading/Listening
                  </button>
                </div>
              </fieldset>

              <fieldset className="choice">
                <legend>Giọng đọc</legend>
                <div className="segmented segmented-2">
                  <button
                    type="button"
                    className={props.listenAccent === "en-GB" ? "selected" : undefined}
                    onClick={() => props.onListenAccent("en-GB")}
                  >
                    🇬🇧 Anh - Anh (UK)
                  </button>
                  <button
                    type="button"
                    className={props.listenAccent === "en-US" ? "selected" : undefined}
                    onClick={() => props.onListenAccent("en-US")}
                  >
                    🇺🇸 Anh - Mỹ (US)
                  </button>
                </div>
              </fieldset>

              {props.listenSource === "words" && (
                <fieldset className="choice">
                  <legend>Độ khó</legend>
                  <div className="segmented">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={d === props.listenDiff ? "selected" : undefined}
                        onClick={() => props.onListenDiff(d)}
                      >
                        {DIFFICULTIES[d].label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <Link
                href={`/listening?source=${props.listenSource}&accent=${props.listenAccent}&difficulty=${props.listenDiff}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/listening.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu nghe →</span>
              </Link>
            </>
          )}

          {props.playTab === "blitz" && (
            <>
              <div className="hub-settings-head">
                <h2>Nối Nghĩa Tốc Độ · Vocab Blitz</h2>
                <p className="muted small">
                  Đua tốc độ chọn 4 đáp án bằng phím 1–4. Đúng liên tiếp 5 câu kích hoạt 🔥 Fever Mode x2 điểm và cộng
                  thêm +2 giây!
                </p>
              </div>

              <fieldset className="choice">
                <legend>Chiều nối nghĩa</legend>
                <div className="segmented segmented-2">
                  <button
                    type="button"
                    className={props.blitzDir === "en-vi" ? "selected" : undefined}
                    onClick={() => props.onBlitzDir("en-vi")}
                  >
                    Anh → Việt
                  </button>
                  <button
                    type="button"
                    className={props.blitzDir === "vi-en" ? "selected" : undefined}
                    onClick={() => props.onBlitzDir("vi-en")}
                  >
                    Việt → Anh
                  </button>
                </div>
              </fieldset>

              <fieldset className="choice">
                <legend>Độ khó</legend>
                <div className="segmented">
                  {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={d === props.blitzDiff ? "selected" : undefined}
                      onClick={() => props.onBlitzDiff(d)}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="choice">
                <legend>Thời gian</legend>
                <div className="segmented">
                  {([30, 60, 90] as const).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={sec === props.blitzSec ? "selected" : undefined}
                      onClick={() => props.onBlitzSec(sec)}
                    >
                      {sec} giây
                    </button>
                  ))}
                </div>
              </fieldset>

              <Link
                href={`/blitz?dir=${props.blitzDir}&difficulty=${props.blitzDiff}&sec=${props.blitzSec}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/blitz.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Chạy Blitz ngay →</span>
              </Link>
            </>
          )}

          {props.playTab === "scramble" && (
            <>
              <div className="hub-settings-head">
                <h2>Xếp Chữ IELTS · Word Scramble</h2>
                <p className="muted small">
                  Nhìn nghĩa tiếng Việt rồi ghép các chữ cái bị xáo trộn thành từ IELTS chuẩn — hỗ trợ bấm thẻ lẫn gõ
                  thẳng bàn phím + gợi ý 1 chữ!
                </p>
              </div>

              <fieldset className="choice">
                <legend>Độ khó (độ dài từ)</legend>
                <div className="segmented">
                  {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={d === props.scrambleDiff ? "selected" : undefined}
                      onClick={() => props.onScrambleDiff(d)}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="hub-feature-grid">
                <div className="hub-feature">
                  <strong>Dễ · 4–6 chữ</strong>
                  <span>Từ phổ biến dễ nhận mặt chữ.</span>
                </div>
                <div className="hub-feature">
                  <strong>Vừa &amp; Khó · 7–13 chữ</strong>
                  <span>Luyện chính tả từ học thuật dài hay sai.</span>
                </div>
              </div>

              <Link
                href={`/scramble?difficulty=${props.scrambleDiff}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/scramble.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu xếp chữ →</span>
              </Link>
            </>
          )}

          {props.playTab === "speaking" && (
            <>
              <div className="hub-settings-head">
                <h2>Phản Xạ Speaking · Part 1–3</h2>
                <p className="muted small">
                  Luyện cụm nói tự nhiên chuẩn giám khảo bản xứ và thử thách Cue Card Part 2 trong 45 giây có bài đọc
                  mẫu!
                </p>
              </div>

              <fieldset className="choice">
                <legend>Chế độ Speaking</legend>
                <div className="ws-mode-list">
                  <button
                    type="button"
                    className={props.speakingMode === "cloze" ? "mode selected" : "mode"}
                    onClick={() => props.onSpeakingMode("cloze")}
                  >
                    <strong>Lấp Khung Nói Nhanh (Part 1–3)</strong>
                    <span>Chọn idiom/collocation tự nhiên như người bản xứ</span>
                  </button>
                  <button
                    type="button"
                    className={props.speakingMode === "cuecard" ? "mode selected" : "mode"}
                    onClick={() => props.onSpeakingMode("cuecard")}
                  >
                    <strong>Thử Thách Cue Card 45 Giây (Part 2)</strong>
                    <span>Tick 4 từ khoá Band 8 khi nói &amp; nghe bài mẫu</span>
                  </button>
                </div>
              </fieldset>

              <Link
                href={`/speaking?mode=${props.speakingMode}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/speaking.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu Speaking →</span>
              </Link>
            </>
          )}
        </section>
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
