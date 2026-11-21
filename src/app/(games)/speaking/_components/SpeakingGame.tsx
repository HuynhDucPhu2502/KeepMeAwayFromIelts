"use client";

// Game #6: Phản Xạ Speaking — Part 1–3 Spoken Collocation Sprint & 45s Part 2 Cue Card Challenge.
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SPEAKING_CLOZE,
  SPEAKING_CUE_CARDS,
  type SpeakingCloze,
  type SpeakingCueCard,
} from "@/lib/speaking/speaking-data";

type SpeakingMode = "cloze" | "cuecard";
const LIVES = 5;

interface PreparedCloze extends SpeakingCloze {
  displayChoices: string[];
  correctIndex: number;
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function speakSample(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.98;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export default function SpeakingGame() {
  const params = useSearchParams();
  const [mode, setMode] = useState<SpeakingMode>(() => (params.get("mode") === "cuecard" ? "cuecard" : "cloze"));
  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [deck, setDeck] = useState<PreparedCloze[]>([]);
  const [cueDeck, setCueDeck] = useState<SpeakingCueCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; picked: number; pts: number } | null>(null);
  // Cue card state
  const [cueSec, setCueSec] = useState(45);
  const [cueRunning, setCueRunning] = useState(false);
  const [usedKeywords, setUsedKeywords] = useState<string[]>([]);
  const [showSample, setShowSample] = useState(false);
  const didAutostart = useRef(false);

  const startRun = useCallback(() => {
    setIdx(0);
    setScore(0);
    setCombo(0);
    setLives(LIVES);
    setCorrect(0);
    setFeedback(null);
    if (mode === "cloze") {
      const prepared = shuffle(SPEAKING_CLOZE).map((q) => {
        const mixed = shuffle(q.choices.map((text, i) => ({ text, ok: i === q.answer })));
        return {
          ...q,
          displayChoices: mixed.map((x) => x.text),
          correctIndex: mixed.findIndex((x) => x.ok),
        };
      });
      setDeck(prepared);
    } else {
      setCueDeck(shuffle(SPEAKING_CUE_CARDS));
      setCueSec(45);
      setCueRunning(true);
      setUsedKeywords([]);
      setShowSample(false);
    }
    setPhase("playing");
  }, [mode]);

  useEffect(() => {
    if (didAutostart.current || params.get("autostart") !== "1") return;
    didAutostart.current = true;
    void Promise.resolve().then(() => startRun());
  }, [params, startRun]);

  useEffect(() => {
    if (phase !== "playing" || mode !== "cuecard" || !cueRunning) return;
    const id = window.setInterval(() => {
      setCueSec((s) => {
        if (s <= 1) {
          setCueRunning(false);
          setShowSample(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, mode, cueRunning]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const currentCloze = deck[idx];
  const currentCue = cueDeck[idx];

  const onPickCloze = useCallback(
    (choiceIdx: number) => {
      if (!currentCloze || feedback) return;
      const ok = choiceIdx === currentCloze.correctIndex;
      if (ok) {
        const nextCombo = combo + 1;
        const pts = 100 * Math.min(5, nextCombo);
        setCombo(nextCombo);
        setScore((s) => s + pts);
        setCorrect((c) => c + 1);
        setFeedback({ ok: true, picked: choiceIdx, pts });
      } else {
        setCombo(0);
        setLives((l) => Math.max(0, l - 1));
        setFeedback({ ok: false, picked: choiceIdx, pts: 0 });
      }
    },
    [currentCloze, feedback, combo],
  );

  const onNextCloze = useCallback(() => {
    if (lives <= 0 || idx + 1 >= deck.length) {
      setPhase("done");
      return;
    }
    setIdx((i) => i + 1);
    setFeedback(null);
  }, [lives, idx, deck.length]);

  const onToggleKeyword = (word: string) => {
    if (usedKeywords.includes(word)) {
      setUsedKeywords((prev) => prev.filter((w) => w !== word));
      setScore((s) => Math.max(0, s - 100));
    } else {
      setUsedKeywords((prev) => [...prev, word]);
      setScore((s) => s + 100);
    }
  };

  const onNextCue = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (idx + 1 >= cueDeck.length) {
      setPhase("done");
      return;
    }
    setIdx((i) => i + 1);
    setCueSec(45);
    setCueRunning(true);
    setUsedKeywords([]);
    setShowSample(false);
  };

  useEffect(() => {
    if (phase !== "playing" || mode !== "cloze" || !currentCloze) return;
    const onKey = (e: KeyboardEvent) => {
      if (feedback && e.key === "Enter") {
        e.preventDefault();
        onNextCloze();
        return;
      }
      if (!feedback) {
        const n = Number(e.key);
        if (n >= 1 && n <= currentCloze.displayChoices.length) {
          e.preventDefault();
          onPickCloze(n - 1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, mode, currentCloze, feedback, onPickCloze, onNextCloze]);

  return (
    <div className="game ws-page">
      <header className={phase === "menu" ? "hud hud-menu" : "hud"}>
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/icons/speaking.png" alt="" width={30} height={30} className="brand-icon" unoptimized />
            <span>Phản Xạ Speaking</span>
          </div>
        </div>
        {phase !== "menu" && (
          <>
            <dl className="hud-stats">
              <div>
                <dt>Điểm</dt>
                <dd>{score.toLocaleString("vi-VN")}</dd>
              </div>
              {mode === "cloze" ? (
                <>
                  <div>
                    <dt>Câu</dt>
                    <dd>
                      {Math.min(idx + 1, deck.length)}/{deck.length}
                    </dd>
                  </div>
                  <div>
                    <dt>Mạng</dt>
                    <dd className="lives">
                      {Array.from({ length: LIVES }, (_, i) => (
                        <span key={i} className={i < lives ? "heart" : "heart lost"} aria-hidden>
                          ♥
                        </span>
                      ))}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Chủ đề</dt>
                    <dd>
                      {Math.min(idx + 1, cueDeck.length)}/{cueDeck.length}
                    </dd>
                  </div>
                  <div>
                    <dt>Đồng hồ</dt>
                    <dd className={cueSec <= 10 ? "boss-map" : undefined}>{cueSec}s</dd>
                  </div>
                </>
              )}
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
                <Image src="/icons/speaking.png" alt="" width={62} height={62} className="menu-hero-icon" unoptimized />
                <div>
                  <h1 className="title">
                    Phản Xạ <span className="accent">Speaking</span>
                  </h1>
                  <p className="muted small">Luyện cụm nói tự nhiên Part 1–3 &amp; thử thách nói Cue Card 45 giây</p>
                </div>
              </div>

              <fieldset className="choice">
                <legend>Chọn chế độ</legend>
                <div className="ws-mode-list">
                  <button
                    type="button"
                    className={mode === "cloze" ? "mode selected" : "mode"}
                    onClick={() => setMode("cloze")}
                  >
                    <strong>Lấp Khung Nói Nhanh (Part 1–3)</strong>
                    <span>12 tình huống thật: chọn đúng idiom/collocation nói chuẩn Band 8</span>
                  </button>
                  <button
                    type="button"
                    className={mode === "cuecard" ? "mode selected" : "mode"}
                    onClick={() => setMode("cuecard")}
                  >
                    <strong>Thử Thách Cue Card 45 Giây (Part 2)</strong>
                    <span>Nói theo thẻ gợi ý, bấm tick 4 từ khoá mục tiêu khi dùng &amp; nghe bài mẫu</span>
                  </button>
                </div>
              </fieldset>

              <button type="button" className="btn primary big" onClick={startRun}>
                Bắt đầu luyện nói
              </button>
              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Kho game</Link>
              </p>
            </div>
          </div>
        )}

        {phase === "playing" && mode === "cloze" && currentCloze && (
          <div className="ws-stage">
            <div className="card arcade-card">
              <div className="ws-play-head">
                <span className="ws-pill ws-pill-task">{currentCloze.part}</span>
                <span className="ws-tag">{currentCloze.topic}</span>
              </div>
              <p className="muted small">
                <strong>Giám khảo hỏi:</strong> “{currentCloze.question}”
              </p>
              <p className="ws-sentence">
                {currentCloze.sentence.split("___").map((chunk, i, arr) => (
                  <span key={i}>
                    {chunk}
                    {i < arr.length - 1 && <span className="ws-blank-token">______</span>}
                  </span>
                ))}
              </p>
              <div className="ws-choices">
                {currentCloze.displayChoices.map((label, ci) => {
                  let cls = "ws-choice";
                  if (feedback) {
                    if (ci === currentCloze.correctIndex) cls += " correct";
                    else if (ci === feedback.picked && !feedback.ok) cls += " wrong";
                  }
                  return (
                    <button
                      key={label}
                      type="button"
                      className={cls}
                      disabled={!!feedback}
                      onClick={() => onPickCloze(ci)}
                    >
                      <span className="ws-choice-key">{ci + 1}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              {feedback && (
                <>
                  <div className={feedback.ok ? "ws-feedback ok" : "ws-feedback bad"}>
                    <div className="ws-feedback-top">
                      <strong>{feedback.ok ? `Rất tự nhiên (+${feedback.pts})!` : "Chưa khớp (-1 ♥)"}</strong>
                      <span className="ws-takeaway">★ {currentCloze.takeaway}</span>
                    </div>
                    <p>{currentCloze.note}</p>
                  </div>
                  <button type="button" className="btn primary big" onClick={onNextCloze}>
                    {lives <= 0 || idx + 1 >= deck.length ? "Xem kết quả" : "Câu tiếp theo"} <kbd>Enter</kbd>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {phase === "playing" && mode === "cuecard" && currentCue && (
          <div className="ws-stage">
            <div className="card ws-arena">
              <section className="ws-context">
                <div className="ws-context-badges">
                  <span className="ws-pill ws-pill-task">Part 2 · Cue Card</span>
                  <span className="ws-pill">{currentCue.topic}</span>
                </div>
                <div className="ws-essay-box">
                  <h2 className="ws-essay-title">{currentCue.title}</h2>
                  <ul className="cue-bullets">
                    {currentCue.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <p className="muted tiny">
                    <strong>Khung nói gợi ý:</strong> {currentCue.template}
                  </p>
                </div>
              </section>

              <section className="ws-play">
                <div className="ws-play-head">
                  <span className="ws-tag">Bấm tick khi bạn nói trúng từ khoá (+100đ)</span>
                  <strong className="accent">{cueSec}s</strong>
                </div>

                <div className="cue-keywords">
                  {currentCue.keywords.map((kw) => {
                    const hit = usedKeywords.includes(kw.word);
                    return (
                      <button
                        key={kw.word}
                        type="button"
                        className={hit ? "cue-kw hit" : "cue-kw"}
                        onClick={() => onToggleKeyword(kw.word)}
                      >
                        <strong>{hit ? "✓ " : ""}{kw.word}</strong>
                        <span>{kw.vi}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="actions">
                  <button type="button" className="btn btn-sm" onClick={() => setCueRunning((r) => !r)}>
                    {cueRunning ? "Tạm dừng đồng hồ" : "Chạy tiếp"}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setShowSample((s) => !s)}>
                    {showSample ? "Ẩn bài mẫu" : "Xem bài mẫu Band 8"}
                  </button>
                </div>

                {showSample && (
                  <div className="ws-feedback ok">
                    <div className="ws-feedback-top">
                      <strong>Bài mẫu tham khảo</strong>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => speakSample(currentCue.sample)}
                      >
                        🔊 Nghe đọc mẫu
                      </button>
                    </div>
                    <p>{currentCue.sample}</p>
                  </div>
                )}

                <button type="button" className="btn primary big" onClick={onNextCue}>
                  {idx + 1 >= cueDeck.length ? "Hoàn thành" : "Chủ đề tiếp theo →"}
                </button>
              </section>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="overlay">
            <div className="card over-card">
              <div className="over-head">
                <Image src="/icons/speaking.png" alt="" width={60} height={60} className="over-icon" unoptimized />
                <div className="over-head-info">
                  <h2>Hoàn thành Speaking!</h2>
                  <p className="final-score">{score.toLocaleString("vi-VN")}</p>
                </div>
              </div>
              {mode === "cloze" && (
                <dl className="summary">
                  <div>
                    <dt>Đúng</dt>
                    <dd>
                      {correct}/{deck.length}
                    </dd>
                  </div>
                  <div>
                    <dt>Mạng còn</dt>
                    <dd>{lives}</dd>
                  </div>
                  <div>
                    <dt>Chế độ</dt>
                    <dd>Part 1–3</dd>
                  </div>
                </dl>
              )}
              <button type="button" className="btn primary big" onClick={startRun}>
                Luyện lượt mới
              </button>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setPhase("menu")}>
                  Đổi chế độ
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
