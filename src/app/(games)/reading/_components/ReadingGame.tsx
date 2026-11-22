"use client";

// Game #7: Reading Sniper — IELTS Academic True / False / Not Given with inline evidence highlight.
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { useBestScores } from "@/hooks/useBestScore";
import { READING_CHALLENGES, type ReadingChallenge, type ReadingVerdict } from "@/lib/reading/reading-data";
import {
  READING_LIVES,
  READING_ROUND_COUNTS,
  READING_TIME_LIMITS,
  buildReadingDeck,
  estimateReadingBand,
  scoreReadingAnswer,
  splitPassageHighlight,
  type ReadingDifficultyFilter,
  type ReadingRoundCount,
} from "@/lib/reading/reading-engine";
import { playError, playGameOver, playSuccess, playTick } from "@/lib/sfx";

const BEST_KEY = "kmafi:reading:best:v1";
const BEST_EVENT = "kmafi:reading:best";

const DIFF_OPTIONS: { id: ReadingDifficultyFilter; label: string }[] = [
  { id: "all", label: "Tổng hợp" },
  { id: "easy", label: "Dễ" },
  { id: "normal", label: "Vừa" },
  { id: "hard", label: "Khó" },
];

const VERDICT_META: Record<ReadingVerdict, { label: string; sub: string; keyHint: string; cls: string }> = {
  TRUE: { label: "TRUE", sub: "Đúng với bài", keyHint: "1 · T", cls: "rd-btn-true" },
  FALSE: { label: "FALSE", sub: "Trái ngược bài", keyHint: "2 · F", cls: "rd-btn-false" },
  NOT_GIVEN: { label: "NOT GIVEN", sub: "Không đề cập", keyHint: "3 · N", cls: "rd-btn-ng" },
};

function parseDiff(raw: string | null): ReadingDifficultyFilter {
  return raw === "easy" || raw === "normal" || raw === "hard" ? raw : "all";
}

function parseCount(raw: string | null): ReadingRoundCount {
  const n = Number(raw);
  return n === 5 || n === 15 ? n : 10;
}

export default function ReadingGame() {
  const params = useSearchParams();
  const [difficulty, setDifficulty] = useState<ReadingDifficultyFilter>(() => parseDiff(params.get("difficulty")));
  const [roundCount, setRoundCount] = useState<ReadingRoundCount>(() => parseCount(params.get("count")));
  const [timed, setTimed] = useState<boolean>(() => params.get("timed") !== "0");

  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [deck, setDeck] = useState<ReadingChallenge[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bestAtStart, setBestAtStart] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(READING_LIVES);
  const [picked, setPicked] = useState<ReadingVerdict | "TIMEOUT" | null>(null);
  const [lastPoints, setLastPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(READING_TIME_LIMITS.all);

  const autoStarted = useRef(false);
  const { scores: bestScores, saveScore } = useBestScores(BEST_KEY, BEST_EVENT);
  const bestKey = `${difficulty}:${roundCount}`;
  const best = bestScores[bestKey] ?? 0;
  const timeLimit = READING_TIME_LIMITS[difficulty];
  const current = deck[index];

  const start = useCallback(
    (d: ReadingDifficultyFilter = difficulty, c: ReadingRoundCount = roundCount) => {
      const nextDeck = buildReadingDeck(READING_CHALLENGES, d, c);
      setDeck(nextDeck);
      setIndex(0);
      setScore(0);
      setBestAtStart(bestScores[`${d}:${c}`] ?? 0);
      setCombo(0);
      setMaxCombo(0);
      setCorrectCount(0);
      setLives(READING_LIVES);
      setPicked(null);
      setLastPoints(0);
      setTimeLeft(READING_TIME_LIMITS[d]);
      setPhase("playing");
    },
    [difficulty, roundCount, bestScores],
  );

  // Auto-start when launched from GameHub with ?autostart=1
  useEffect(() => {
    if (params.get("autostart") !== "1" || autoStarted.current) return;
    autoStarted.current = true;
    const d = parseDiff(params.get("difficulty"));
    const c = parseCount(params.get("count"));
    void Promise.resolve().then(() => start(d, c));
  }, [params, start]);

  // Countdown timer per question (when timed mode is enabled)
  useEffect(() => {
    if (phase !== "playing" || !timed || picked !== null || !current) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playError();
          setPicked("TIMEOUT");
          setCombo(0);
          setLastPoints(0);
          setLives((l) => Math.max(0, l - 1));
          return 0;
        }
        if (prev <= 6) playTick();
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, timed, picked, current]);

  const onAnswer = useCallback(
    (choice: ReadingVerdict) => {
      if (phase !== "playing" || picked !== null || !current) return;
      const isRight = choice === current.answer;
      const res = scoreReadingAnswer(isRight, combo, timed ? timeLeft : timeLimit * 0.5, timeLimit);
      setPicked(choice);
      setLastPoints(res.points);
      setCombo(res.nextCombo);
      if (isRight) {
        playSuccess(res.nextCombo);
        setScore((s) => s + res.points);
        setCorrectCount((n) => n + 1);
        setMaxCombo((m) => Math.max(m, res.nextCombo));
      } else {
        playError();
        setLives((l) => Math.max(0, l - 1));
      }
    },
    [phase, picked, current, combo, timed, timeLeft, timeLimit],
  );

  const onNext = useCallback(() => {
    if (phase !== "playing" || picked === null) return;
    if (lives <= 0 || index + 1 >= deck.length) {
      saveScore(bestKey, score);
      playGameOver(lives > 0);
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setLastPoints(0);
    setTimeLeft(timeLimit);
  }, [phase, picked, lives, index, deck.length, saveScore, bestKey, score, timeLimit]);

  // Keyboard shortcuts: 1/T = TRUE, 2/F = FALSE, 3/N = NOT GIVEN, Enter/Space = next
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (phase === "playing" && picked === null) {
        const k = event.key.toLowerCase();
        if (k === "1" || k === "t") {
          event.preventDefault();
          onAnswer("TRUE");
        } else if (k === "2" || k === "f") {
          event.preventDefault();
          onAnswer("FALSE");
        } else if (k === "3" || k === "n") {
          event.preventDefault();
          onAnswer("NOT_GIVEN");
        }
      } else if (phase === "playing" && picked !== null && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, picked, onAnswer, onNext]);

  const answeredCount = phase === "done" ? Math.min(index + 1, deck.length) : index + (picked ? 1 : 0);
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;
  const band = estimateReadingBand(accuracy, maxCombo);
  const newRecord = phase === "done" && score > 0 && score > bestAtStart;
  const parts = current ? splitPassageHighlight(current.passage, current.evidence) : null;

  return (
    <div className="game ws-page">
      <header className={phase === "menu" ? "hud hud-menu" : "hud"}>
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/icons/reading.webp" alt="" width={30} height={30} className="brand-icon" loading="eager" unoptimized />
            <span>Reading Sniper</span>
          </div>
        </div>
        {phase !== "menu" ? (
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
              {timed && (
                <div>
                  <dt>Đồng hồ</dt>
                  <dd className={timeLeft <= 5 && picked === null ? "boss-map" : undefined}>{timeLeft}s</dd>
                </div>
              )}
              <div>
                <dt>Mạng</dt>
                <dd className="lives" aria-label={`Còn ${lives} mạng`}>
                  {Array.from({ length: READING_LIVES }, (_, i) => (
                    <span key={i} className={i < lives ? "heart" : "heart lost"} aria-hidden>
                      ♥
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="hud-actions">
              <SoundToggle />
              <button type="button" className="hud-pause" onClick={() => setPhase("menu")}>
                Đổi chế độ
              </button>
            </div>
          </>
        ) : (
          <SoundToggle />
        )}
      </header>

      <main className="field ws-field">
        {phase === "menu" && (
          <div className="overlay">
            <div className="card ws-menu-card">
              <div className="menu-hero">
                <Image src="/icons/reading.webp" alt="" width={62} height={62} className="menu-hero-icon" priority unoptimized />
                <div>
                  <h1 className="title">
                    Reading <span className="accent">Sniper</span>
                  </h1>
                  <p className="muted small">
                    Bắt bẫy True / False / Not Given chuẩn IELTS Academic — trả lời xong tự động highlight câu dẫn chứng!
                  </p>
                </div>
              </div>

              <fieldset className="choice">
                <legend>Độ khó</legend>
                <div className="segmented">
                  {DIFF_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={d.id === difficulty ? "selected" : undefined}
                      onClick={() => setDifficulty(d.id)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="choice">
                <legend>Số câu mỗi lượt</legend>
                <div className="segmented">
                  {READING_ROUND_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={n === roundCount ? "selected" : undefined}
                      onClick={() => setRoundCount(n)}
                    >
                      {n} câu
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="switch">
                <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
                <span>Bật đồng hồ áp lực ({READING_TIME_LIMITS[difficulty]} giây / câu)</span>
              </label>

              <button type="button" className="btn primary big" onClick={() => start()}>
                Bắt đầu đọc &amp; bắt bẫy →
              </button>

              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Kho game</Link> · Phím tắt khi chơi: <kbd>1</kbd> True · <kbd>2</kbd> False ·{" "}
                <kbd>3</kbd> Not Given
              </p>
            </div>
          </div>
        )}

        {phase === "playing" && current && (
          <section className="ws-stage">
            <div className="ws-card rd-card">
              <div className="ws-card-head">
                <span className="ws-tag">Reading · {current.topic}</span>
                <span className="rd-diff-pill">
                  {current.difficulty === "easy" ? "Dễ" : current.difficulty === "normal" ? "Vừa" : "Khó"}
                </span>
                {timed && (
                  <div className="rd-timer-bar" aria-hidden>
                    <span
                      className={timeLeft <= 5 && picked === null ? "urgent" : undefined}
                      style={{ width: `${Math.max(0, (timeLeft / timeLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <article className="rd-passage" aria-label="Đoạn văn IELTS Reading">
                {picked && parts && parts.match ? (
                  <p>
                    {parts.before}
                    <mark
                      className={
                        current.answer === "TRUE"
                          ? "rd-mark rd-mark-true"
                          : current.answer === "FALSE"
                            ? "rd-mark rd-mark-false"
                            : "rd-mark rd-mark-ng"
                      }
                    >
                      {parts.match}
                    </mark>
                    {parts.after}
                  </p>
                ) : (
                  <p>{current.passage}</p>
                )}
              </article>

              <div className="rd-statement">
                <span className="rd-statement-label">Mệnh đề cần kiểm tra</span>
                <p>{current.statement}</p>
              </div>

              <div className="rd-verdicts" role="group" aria-label="Chọn True, False hoặc Not Given">
                {(["TRUE", "FALSE", "NOT_GIVEN"] as ReadingVerdict[]).map((v) => {
                  const meta = VERDICT_META[v];
                  const isCorrectOpt = picked !== null && v === current.answer;
                  const isWrongPick = picked === v && v !== current.answer;
                  const cls = [
                    "rd-verdict-btn",
                    meta.cls,
                    isCorrectOpt ? "correct" : "",
                    isWrongPick ? "wrong" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={v}
                      type="button"
                      className={cls}
                      disabled={picked !== null}
                      onClick={() => onAnswer(v)}
                    >
                      <span className="rd-verdict-top">
                        <strong>{meta.label}</strong>
                        <kbd>{meta.keyHint}</kbd>
                      </span>
                      <span className="rd-verdict-sub">{meta.sub}</span>
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className={picked === current.answer ? "ws-feedback ok" : "ws-feedback bad"}>
                  <div className="ws-feedback-head">
                    <strong>
                      {picked === current.answer
                        ? `Chính xác! +${lastPoints} điểm`
                        : picked === "TIMEOUT"
                          ? `Hết giờ! Đáp án là ${current.answer.replace("_", " ")}`
                          : `Bị lừa rồi! Đáp án đúng là ${current.answer.replace("_", " ")}`}
                    </strong>
                    <span className="rd-trap-badge">{current.trapType}</span>
                  </div>
                  <p>{current.explanation}</p>
                  <button type="button" className="btn primary" onClick={onNext}>
                    {lives <= 0 || index + 1 >= deck.length ? "Xem kết quả" : "Câu tiếp theo"} <kbd>Enter</kbd>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {phase === "done" && (
          <div className="overlay">
            <div className="card over-card">
              <div className="over-head">
                <Image
                  src={newRecord || accuracy >= 80 ? "/icons/trophy.webp" : "/icons/reading.webp"}
                  alt=""
                  width={60}
                  height={60}
                  className="over-icon"
                  unoptimized
                />
                <div className="over-head-info">
                  <h2>{newRecord ? "Kỷ lục Reading mới!" : lives <= 0 ? "Hết mạng rồi!" : "Hoàn thành Reading Sniper!"}</h2>
                  <p className="final-score">{score.toLocaleString("vi-VN")}</p>
                  <p className="muted small">
                    Reading Band ước tính: <strong>{band}</strong> · Kỷ lục:{" "}
                    {Math.max(best, score).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
              <dl className="summary">
                <div>
                  <dt>Đúng</dt>
                  <dd>
                    {correctCount}/{answeredCount}
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
              <div className="actions">
                <button type="button" className="btn primary" onClick={() => start()}>
                  Chơi lượt mới
                </button>
                <button type="button" className="btn" onClick={() => setPhase("menu")}>
                  Đổi độ khó
                </button>
                <Link href="/" className="btn">
                  ← Kho game
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
