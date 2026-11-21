"use client";

// Game #3: Nghe & Gõ (Listening Dictation) using browser SpeechSynthesis (UK / US accent, zero API cost).
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import wordsData from "@/data/words.json";
import phrasesData from "@/data/phrases.json";
import { DIFFICULTIES, type Difficulty, type Entry } from "../game/engine";
import { compareSpelling, filterListeningPool, type DiffChar } from "../arcade/arcade-logic";

const WORDS = wordsData as Entry[];
const PHRASES = phrasesData as Entry[];
const LIVES = 5;

function speakEnglish(text: string, accent: "en-GB" | "en-US", rate: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = accent;
    u.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(accent.toLowerCase()));
    if (match) u.voice = match;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export default function ListeningGame() {
  const params = useSearchParams();
  const [source, setSource] = useState<"words" | "phrases">(() =>
    params.get("source") === "phrases" ? "phrases" : "words",
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const d = params.get("difficulty");
    return d === "easy" || d === "normal" || d === "hard" ? d : "easy";
  });
  const [accent, setAccent] = useState<"en-GB" | "en-US">(() =>
    params.get("accent") === "en-US" ? "en-US" : "en-GB",
  );
  const [rate, setRate] = useState<number>(1);
  const [showHint, setShowHint] = useState(true);
  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [current, setCurrent] = useState<Entry | null>(null);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [cleared, setCleared] = useState(0);
  const [result, setResult] = useState<{ exact: boolean; chars: DiffChar[]; points: number } | null>(null);
  const [ttsOk, setTtsOk] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const didAutostart = useRef(false);

  const pool = useMemo(() => filterListeningPool(WORDS, PHRASES, source, difficulty), [source, difficulty]);

  const pickNext = useCallback(
    (avoid?: string) => {
      const n = pool.length;
      let idx = Math.floor(Math.random() * n);
      if (avoid && n > 1 && pool[idx].text === avoid) idx = (idx + 1) % n;
      const entry = pool[idx];
      setCurrent(entry);
      setTyped("");
      setResult(null);
      setTtsOk(speakEnglish(entry.text, accent, rate));
      window.setTimeout(() => inputRef.current?.focus(), 40);
    },
    [pool, accent, rate],
  );

  const startRun = useCallback(() => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(LIVES);
    setCleared(0);
    setPhase("playing");
    pickNext();
  }, [pickNext]);

  useEffect(() => {
    if (didAutostart.current || params.get("autostart") !== "1") return;
    didAutostart.current = true;
    void Promise.resolve().then(() => startRun());
  }, [params, startRun]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const onReplay = useCallback(() => {
    if (!current) return;
    setTtsOk(speakEnglish(current.text, accent, rate));
    inputRef.current?.focus();
  }, [current, accent, rate]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!current) return;
    if (result) {
      if (lives <= 0) setPhase("done");
      else pickNext(current.text);
      return;
    }
    if (!typed.trim()) return;
    const cmp = compareSpelling(typed, current.text);
    if (cmp.exact) {
      const nextCombo = combo + 1;
      const pts = 100 * Math.min(5, nextCombo);
      setCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);
      setScore((s) => s + pts);
      setCleared((c) => c + 1);
      setResult({ ...cmp, points: pts });
    } else {
      setCombo(0);
      setLives((l) => Math.max(0, l - 1));
      setResult({ ...cmp, points: 0 });
    }
  };

  return (
    <div className="game ws-page">
      <header className={phase === "menu" ? "hud hud-menu" : "hud"}>
        <Link href="/" className="hud-brand">
          <Image src="/icons/listening.png" alt="" width={30} height={30} className="brand-icon" unoptimized />
          <span>Keep Me Away From IELTS · Listening</span>
        </Link>
        {phase !== "menu" && (
          <>
            <dl className="hud-stats">
              <div>
                <dt>Điểm</dt>
                <dd>{score.toLocaleString("vi-VN")}</dd>
              </div>
              <div>
                <dt>Đúng</dt>
                <dd>{cleared}</dd>
              </div>
              <div>
                <dt>Combo</dt>
                <dd className={combo >= 3 ? "hot" : undefined}>x{combo}</dd>
              </div>
              <div>
                <dt>Mạng</dt>
                <dd className="lives" aria-label={`Còn ${lives} mạng`}>
                  {Array.from({ length: LIVES }, (_, i) => (
                    <span key={i} className={i < lives ? "heart" : "heart lost"} aria-hidden>
                      ♥
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <button type="button" className="hud-pause" onClick={() => setPhase("menu")}>
              Về menu
            </button>
          </>
        )}
      </header>

      <main className="field ws-field">
        {phase === "menu" && (
          <div className="overlay">
            <div className="card ws-menu-card">
              <div className="menu-hero">
                <Image src="/icons/listening.png" alt="" width={62} height={62} className="menu-hero-icon" unoptimized />
                <div>
                  <h1 className="title">
                    Nghe &amp; <span className="accent">Gõ</span>
                  </h1>
                  <p className="muted small">Luyện IELTS Listening + chính tả chuẩn Anh-Anh / Anh-Mỹ</p>
                </div>
              </div>

              <fieldset className="choice">
                <legend>Nội dung nghe</legend>
                <div className="segmented segmented-2">
                  <button
                    type="button"
                    className={source === "words" ? "selected" : undefined}
                    onClick={() => setSource("words")}
                  >
                    Từ đơn IELTS
                  </button>
                  <button
                    type="button"
                    className={source === "phrases" ? "selected" : undefined}
                    onClick={() => setSource("phrases")}
                  >
                    Cụm từ Reading/Listening
                  </button>
                </div>
              </fieldset>

              <fieldset className="choice">
                <legend>Giọng đọc &amp; Tốc độ</legend>
                <div className="segmented segmented-2">
                  <button
                    type="button"
                    className={accent === "en-GB" ? "selected" : undefined}
                    onClick={() => setAccent("en-GB")}
                  >
                    🇬🇧 Anh - Anh (UK)
                  </button>
                  <button
                    type="button"
                    className={accent === "en-US" ? "selected" : undefined}
                    onClick={() => setAccent("en-US")}
                  >
                    🇺🇸 Anh - Mỹ (US)
                  </button>
                </div>
                <div className="segmented">
                  {[
                    { v: 0.85, l: "Chậm 0.85x" },
                    { v: 1, l: "Chuẩn 1.0x" },
                    { v: 1.15, l: "Nhanh 1.15x" },
                  ].map((r) => (
                    <button
                      key={r.v}
                      type="button"
                      className={rate === r.v ? "selected" : undefined}
                      onClick={() => setRate(r.v)}
                    >
                      {r.l}
                    </button>
                  ))}
                </div>
              </fieldset>

              {source === "words" && (
                <fieldset className="choice">
                  <legend>Độ khó</legend>
                  <div className="segmented">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={difficulty === d ? "selected" : undefined}
                        onClick={() => setDifficulty(d)}
                      >
                        {DIFFICULTIES[d].label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <label className="switch">
                <input type="checkbox" checked={showHint} onChange={(e) => setShowHint(e.target.checked)} />
                <span>Hiện gợi ý nghĩa tiếng Việt</span>
              </label>

              <button type="button" className="btn primary big" onClick={startRun}>
                Bắt đầu nghe
              </button>
              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Kho game</Link>
              </p>
            </div>
          </div>
        )}

        {phase === "playing" && current && (
          <div className="ws-stage">
            <form className="card arcade-card" onSubmit={onSubmit}>
              <div className="arcade-audio-box">
                <button type="button" className="btn primary arcade-speak-btn" onClick={onReplay}>
                  🔊 Nghe lại ({accent === "en-GB" ? "UK" : "US"})
                </button>
                {showHint && current.meaning && (
                  <p className="arcade-meaning">
                    Nghĩa: <strong>{current.meaning}</strong>
                  </p>
                )}
                {!ttsOk && (
                  <p className="party-error tiny">
                    Trình duyệt không hỗ trợ đọc giọng nói — từ cần gõ có {current.text.length} ký tự.
                  </p>
                )}
              </div>

              <input
                ref={inputRef}
                className="type-input arcade-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                readOnly={!!result}
                placeholder="Gõ chính xác từ bạn vừa nghe…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
              />

              {result && (
                <div className={result.exact ? "ws-feedback ok" : "ws-feedback bad"}>
                  <strong>
                    {result.exact ? `Chính xác (+${result.points} điểm)!` : "Chưa khớp chính tả (-1 ♥):"}
                  </strong>
                  <div className="arcade-diff" aria-label={`Đáp án: ${current.text}`}>
                    {result.chars.map((c, i) => (
                      <span key={i} className={c.ok ? "diff-ok" : "diff-bad"}>
                        {c.char}
                      </span>
                    ))}
                  </div>
                  {current.meaning && <span className="tiny">Nghĩa: {current.meaning}</span>}
                </div>
              )}

              <button type="submit" className="btn primary big">
                {result ? (lives <= 0 ? "Xem kết quả" : "Từ tiếp theo") : "Kiểm tra"} <kbd>Enter</kbd>
              </button>
            </form>
          </div>
        )}

        {phase === "done" && (
          <div className="overlay">
            <div className="card over-card">
              <div className="over-head">
                <Image src="/icons/listening.png" alt="" width={60} height={60} className="over-icon" unoptimized />
                <div className="over-head-info">
                  <h2>Hoàn thành Nghe &amp; Gõ!</h2>
                  <p className="final-score">{score.toLocaleString("vi-VN")}</p>
                </div>
              </div>
              <dl className="summary">
                <div>
                  <dt>Nghe đúng</dt>
                  <dd>{cleared}</dd>
                </div>
                <div>
                  <dt>Combo max</dt>
                  <dd>x{maxCombo}</dd>
                </div>
                <div>
                  <dt>Giọng đọc</dt>
                  <dd>{accent === "en-GB" ? "UK" : "US"}</dd>
                </div>
              </dl>
              <button type="button" className="btn primary big" onClick={startRun}>
                Nghe lượt mới
              </button>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setPhase("menu")}>
                  Đổi cài đặt
                </button>
                <Link href="/" className="btn">
                  Về kho game
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
