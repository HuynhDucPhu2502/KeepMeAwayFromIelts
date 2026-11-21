"use client";

// Game #2: Writing Sprint — IELTS Writing Task 1 (Chart Detective) & Task 2 (Cloze + Coherence Puzzle).
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChartVisual } from "./ChartVisual";
import { WRITING_CHALLENGES, WRITING_EXERCISES } from "./writing-data";
import {
  WRITING_LIVES,
  WRITING_ROUND_COUNTS,
  buildWritingDeck,
  estimateWritingBand,
  isOrderCorrect,
  scoreWritingAnswer,
  type PreparedChallenge,
  type WritingMode,
  type WritingRoundCount,
} from "./writing-engine";

const BEST_KEY = "kmafi:writing:best:v1";
const BEST_EVENT = "kmafi:writing:best";

function readBestRaw() {
  try {
    return window.localStorage.getItem(BEST_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeBest(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(BEST_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(BEST_EVENT, cb);
  };
}

function parseBest(raw: string): Record<string, number> {
  try {
    const val: unknown = raw ? JSON.parse(raw) : {};
    return val && typeof val === "object" ? (val as Record<string, number>) : {};
  } catch {
    return {};
  }
}

const MODE_META: Record<WritingMode, { label: string; detail: string }> = {
  task1: {
    label: "Task 1 · Soi Biểu Đồ",
    detail: "8 biểu đồ thật: sửa lỗi xu hướng, soi số liệu & cụm tả chart",
  },
  task2: {
    label: "Task 2 · Lấp Khung & Xếp Mạch",
    detail: "6 dạng luận: điền collocation Band 8 & xếp logic 4 đoạn văn",
  },
  mixed: {
    label: "Tổng hợp (Task 1 + 2)",
    detail: "Trộn ngẫu nhiên cả soi biểu đồ lẫn lập luận bài luận",
  },
};

function parseInitialMode(raw: string | null): WritingMode {
  if (raw === "task1" || raw === "task2" || raw === "mixed") return raw;
  return "mixed";
}

function parseInitialCount(raw: string | null): WritingRoundCount {
  const n = Number(raw);
  return (WRITING_ROUND_COUNTS as readonly number[]).includes(n) ? (n as WritingRoundCount) : 10;
}

function renderSentence(sentence: string) {
  // Split on `{{error}}` or `___`
  const parts = sentence.split(/(\{\{[^}]+\}\}|___)/g);
  return parts.map((part, i) => {
    if (part.startsWith("{{") && part.endsWith("}}")) {
      return (
        <span key={i} className="ws-err-token">
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part === "___") {
      return (
        <span key={i} className="ws-blank-token">
          ______
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface AnswerFeedback {
  ok: boolean;
  points: number;
  speedBonus: boolean;
  pickedChoice?: number;
}

export default function WritingGame() {
  const params = useSearchParams();
  const [mode, setMode] = useState<WritingMode>(() => parseInitialMode(params.get("mode")));
  const [roundCount, setRoundCount] = useState<WritingRoundCount>(() => parseInitialCount(params.get("count")));
  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [deck, setDeck] = useState<PreparedChallenge[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(WRITING_LIVES);
  const [correctCount, setCorrectCount] = useState(0);
  const [orderPick, setOrderPick] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [bestAtStart, setBestAtStart] = useState(0);
  const questionStartAt = useRef(0);
  const didAutostart = useRef(false);

  const bestRaw = useSyncExternalStore(subscribeBest, readBestRaw, () => "");
  const bestScores = useMemo(() => parseBest(bestRaw), [bestRaw]);
  const bestKey = `${mode}:${roundCount}`;
  const best = bestScores[bestKey] ?? 0;

  const current = deck[index];
  const exercise = current ? WRITING_EXERCISES[current.exerciseId] : undefined;

  const saveBestIfHigher = useCallback(
    (finalScore: number) => {
      const scores = parseBest(readBestRaw());
      if (finalScore > (scores[bestKey] ?? 0)) {
        scores[bestKey] = finalScore;
        try {
          window.localStorage.setItem(BEST_KEY, JSON.stringify(scores));
        } catch {
          // ignore private mode
        }
        window.dispatchEvent(new Event(BEST_EVENT));
      }
    },
    [bestKey],
  );

  const startRun = useCallback(() => {
    const nextDeck = buildWritingDeck(WRITING_CHALLENGES, mode, roundCount, Math.random);
    setDeck(nextDeck);
    setIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(WRITING_LIVES);
    setCorrectCount(0);
    setOrderPick([]);
    setFeedback(null);
    setTakeaways([]);
    setBestAtStart(best);
    questionStartAt.current = performance.now();
    setPhase("playing");
  }, [mode, roundCount, best]);

  // Auto-launch straight into play when opened from the main hub's settings panel.
  useEffect(() => {
    if (didAutostart.current || params.get("autostart") !== "1") return;
    didAutostart.current = true;
    void Promise.resolve().then(() => startRun());
  }, [params, startRun]);

  const applyOutcome = useCallback(
    (ok: boolean, isOrder: boolean, takeaway: string, pickedChoice?: number) => {
      const elapsedSec = (performance.now() - questionStartAt.current) / 1000;
      const res = scoreWritingAnswer(ok, combo, elapsedSec, isOrder);
      const nextScore = score + res.points;
      const nextLives = ok ? lives : Math.max(0, lives - 1);
      setScore(nextScore);
      setCombo(res.nextCombo);
      if (res.nextCombo > maxCombo) setMaxCombo(res.nextCombo);
      setLives(nextLives);
      if (ok) setCorrectCount((c) => c + 1);
      setTakeaways((prev) => (prev.includes(takeaway) ? prev : [...prev, takeaway]));
      setFeedback({ ok, points: res.points, speedBonus: res.speedBonus, pickedChoice });
      if (nextLives === 0 || index + 1 >= deck.length) {
        saveBestIfHigher(nextScore);
      }
    },
    [combo, score, lives, maxCombo, index, deck.length, saveBestIfHigher],
  );

  const onPickChoice = useCallback(
    (choiceIdx: number) => {
      if (!current || current.kind === "order" || feedback) return;
      applyOutcome(choiceIdx === current.correctIndex, false, current.takeaway, choiceIdx);
    },
    [current, feedback, applyOutcome],
  );

  const onToggleOrderTile = useCallback(
    (origStepIdx: number) => {
      if (!current || current.kind !== "order" || feedback) return;
      const existingPos = orderPick.indexOf(origStepIdx);
      if (existingPos >= 0) {
        setOrderPick((prev) => prev.filter((x) => x !== origStepIdx));
        return;
      }
      const next = [...orderPick, origStepIdx];
      setOrderPick(next);
      if (next.length === current.steps.length) {
        const ok = isOrderCorrect(next, current.steps.length);
        applyOutcome(ok, true, current.takeaway);
      }
    },
    [current, feedback, orderPick, applyOutcome],
  );

  const onNext = useCallback(() => {
    if (!feedback) return;
    if (lives <= 0 || index + 1 >= deck.length) {
      saveBestIfHigher(score);
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setOrderPick([]);
    setFeedback(null);
    questionStartAt.current = performance.now();
  }, [feedback, lives, index, deck.length, saveBestIfHigher, score]);

  // Keyboard shortcuts: Enter to start/advance, 1-3 to pick choices quickly.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "menu" && e.key === "Enter") {
        e.preventDefault();
        startRun();
        return;
      }
      if (phase === "done" && e.key === "Enter") {
        e.preventDefault();
        startRun();
        return;
      }
      if (phase !== "playing" || !current) return;
      if (feedback && e.key === "Enter") {
        e.preventDefault();
        onNext();
        return;
      }
      if (!feedback && current.kind !== "order") {
        const num = Number(e.key);
        if (num >= 1 && num <= current.displayChoices.length) {
          e.preventDefault();
          onPickChoice(num - 1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, feedback, startRun, onNext, onPickChoice]);

  const answeredTotal = Math.min(deck.length, index + (feedback ? 1 : 0));
  const accuracy = answeredTotal > 0 ? Math.round((correctCount / answeredTotal) * 100) : 100;
  const band = estimateWritingBand(correctCount, deck.length || 1, maxCombo);
  const newRecord = phase === "done" && score > 0 && score > bestAtStart;

  return (
    <div className="game ws-page">
      <header className={phase === "menu" ? "hud hud-menu" : "hud"}>
        <Link href="/" className="hud-brand">
          <Image src="/logo.png" alt="Keep Me Away From IELTS" width={30} height={30} className="brand-icon" unoptimized />
          <span>Keep Me Away From IELTS · Writing</span>
        </Link>
        {phase !== "menu" && (
          <>
            <dl className="hud-stats">
              <div>
                <dt>Điểm</dt>
                <dd>{score.toLocaleString("vi-VN")}</dd>
              </div>
              <div>
                <dt>Câu</dt>
                <dd>
                  {Math.min(index + 1, deck.length)}/{deck.length}
                </dd>
              </div>
              <div>
                <dt>Combo</dt>
                <dd className={combo >= 3 ? "hot" : undefined}>x{combo}</dd>
              </div>
              <div>
                <dt>Mạng</dt>
                <dd className="lives" aria-label={`Còn ${lives} mạng`}>
                  {Array.from({ length: WRITING_LIVES }, (_, i) => (
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
                <Image src="/icons/mascot.png" alt="" width={62} height={62} className="menu-hero-icon" unoptimized />
                <div>
                  <h1 className="title">
                    Writing <span className="accent">Sprint</span>
                  </h1>
                  <p className="muted small">Soi biểu đồ Task 1 · Lấp khung & xếp mạch Task 2</p>
                </div>
              </div>

              <fieldset className="choice">
                <legend>Chọn chế độ</legend>
                <div className="ws-mode-list">
                  {(Object.keys(MODE_META) as WritingMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={m === mode ? "mode selected" : "mode"}
                      aria-pressed={m === mode}
                      onClick={() => setMode(m)}
                    >
                      <strong>{MODE_META[m].label}</strong>
                      <span>{MODE_META[m].detail}</span>
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
                      className={n === roundCount ? "selected" : undefined}
                      aria-pressed={n === roundCount}
                      onClick={() => setRoundCount(n)}
                    >
                      {n} câu
                    </button>
                  ))}
                </div>
              </fieldset>

              <button type="button" className="btn primary big" onClick={startRun}>
                Bắt đầu <kbd>Enter</kbd>
              </button>

              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Gõ từ rơi</Link>
              </p>
            </div>
          </div>
        )}

        {phase === "playing" && current && exercise && (
          <div className="ws-stage">
            <div className="card ws-arena">
              {/* Left panel: Task 1 chart or Task 2 prompt */}
              <section className="ws-context">
                <div className="ws-context-badges">
                  <span className="ws-pill ws-pill-task">{exercise.task === "task1" ? "Task 1" : "Task 2"}</span>
                  <span className="ws-pill">{exercise.typeLabel}</span>
                </div>
                {exercise.visual ? (
                  <>
                    <ChartVisual visual={exercise.visual} />
                    <p className="muted tiny">{exercise.question}</p>
                  </>
                ) : (
                  <div className="ws-essay-box">
                    <h2 className="ws-essay-title">{exercise.titleVi}</h2>
                    <p className="ws-essay-prompt">{exercise.question}</p>
                    <div className="ws-vocab-strip">
                      <span className="muted tiny">Từ khoá chủ đề:</span>
                      <div className="ws-chips">
                        {exercise.vocab.map((v) => (
                          <span key={v} className="ws-chip">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Right panel: Active challenge */}
              <section className="ws-play">
                <div className="ws-play-head">
                  <span className="ws-tag">{current.tag}</span>
                  {current.kind !== "order" && !feedback && (
                    <span className="muted tiny">Phím nhanh 1–{current.displayChoices.length}</span>
                  )}
                </div>

                {current.kind !== "order" ? (
                  <>
                    <p className="ws-sentence">{renderSentence(current.sentence)}</p>
                    <div className="ws-choices">
                      {current.displayChoices.map((label, ci) => {
                        let cls = "ws-choice";
                        if (feedback) {
                          if (ci === current.correctIndex) cls += " correct";
                          else if (ci === feedback.pickedChoice && !feedback.ok) cls += " wrong";
                        }
                        return (
                          <button
                            key={label}
                            type="button"
                            className={cls}
                            disabled={!!feedback}
                            onClick={() => onPickChoice(ci)}
                          >
                            <span className="ws-choice-key">{ci + 1}</span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="ws-order-hint">{current.instruction}</p>
                    <div className="ws-order-list">
                      {current.shuffledIndices.map((origIdx) => {
                        const step = current.steps[origIdx];
                        const pickedPos = orderPick.indexOf(origIdx);
                        let cls = "ws-order-tile";
                        if (pickedPos >= 0) cls += " picked";
                        if (feedback) {
                          if (pickedPos === origIdx) cls += " correct";
                          else cls += " wrong";
                        }
                        return (
                          <button
                            key={origIdx}
                            type="button"
                            className={cls}
                            disabled={!!feedback}
                            onClick={() => onToggleOrderTile(origIdx)}
                          >
                            <span className="ws-order-num">{pickedPos >= 0 ? pickedPos + 1 : "•"}</span>
                            <span className="ws-order-text">
                              {feedback && <strong className="ws-order-role">{origIdx + 1}. {step.role}: </strong>}
                              {step.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {feedback && (
                  <div className={feedback.ok ? "ws-feedback ok" : "ws-feedback bad"}>
                    <div className="ws-feedback-top">
                      <strong>
                        {feedback.ok
                          ? `Chuẩn (+${feedback.points} điểm)${feedback.speedBonus ? " · Nhanh tay +50!" : ""}`
                          : "Chưa đúng (-1 ♥)"}
                      </strong>
                      <span className="ws-takeaway">★ {current.takeaway}</span>
                    </div>
                    <p>{current.note}</p>
                  </div>
                )}

                {feedback && (
                  <button type="button" className="btn primary big" onClick={onNext}>
                    {lives <= 0 || index + 1 >= deck.length ? "Xem kết quả" : "Câu tiếp theo"} <kbd>Enter</kbd>
                  </button>
                )}
              </section>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="overlay">
            <div className="card over-card ws-done-card">
              <div className="over-head">
                <Image
                  src={newRecord || accuracy >= 80 ? "/icons/trophy.png" : "/icons/mascot.png"}
                  alt=""
                  width={64}
                  height={64}
                  className="over-icon"
                  unoptimized
                />
                <div className="over-head-info">
                  <h2>{lives <= 0 ? "Hết mạng rồi!" : newRecord ? "Kỷ lục mới!" : "Hoàn thành lượt Writing!"}</h2>
                  <p className="final-score">{score.toLocaleString("vi-VN")}</p>
                  <p className="muted small">Kỷ lục: {Math.max(best, score).toLocaleString("vi-VN")}</p>
                </div>
                <div className="ws-band-pill">
                  <span>Band ước tính</span>
                  <strong>{band}</strong>
                </div>
              </div>

              <dl className="summary">
                <div>
                  <dt>Trả lời đúng</dt>
                  <dd>
                    {correctCount}/{answeredTotal}
                  </dd>
                </div>
                <div>
                  <dt>Chính xác</dt>
                  <dd>{accuracy}%</dd>
                </div>
                <div>
                  <dt>Combo max</dt>
                  <dd>x{maxCombo}</dd>
                </div>
              </dl>

              {takeaways.length > 0 && (
                <div className="ws-takeaways">
                  <span className="muted tiny">Cụm ăn điểm vừa ôn:</span>
                  <div className="ws-chips">
                    {takeaways.slice(0, 8).map((t) => (
                      <span key={t} className="ws-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" className="btn primary big" onClick={startRun}>
                Chơi lượt mới <kbd>Enter</kbd>
              </button>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setPhase("menu")}>
                  Đổi chế độ
                </button>
                <Link href="/" className="btn">
                  Về trang chính
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
