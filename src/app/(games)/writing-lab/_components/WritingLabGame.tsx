"use client";

// Game #8: Paraphrase Lab — Upgrade Band 5 -> Band 8, Spot Grammar/Tone Errors, Build Complex Sentences.
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { useBestScores } from "@/hooks/useBestScore";
import { playError, playGameOver, playKey, playSuccess } from "@/lib/sfx";
import { LAB_CHALLENGES } from "@/lib/writing-lab/lab-data";
import {
  LAB_LIVES,
  LAB_ROUND_COUNTS,
  buildLabDeck,
  buildUpgradeHint,
  estimateLabBand,
  isBuildCorrect,
  isUpgradeMatch,
  scoreLabAnswer,
  type LabMode,
  type LabRoundCount,
  type PreparedLabChallenge,
} from "@/lib/writing-lab/lab-engine";

const BEST_KEY = "kmafi:writing-lab:best:v1";
const BEST_EVENT = "kmafi:writing-lab:best";

const MODE_META: Record<LabMode, { label: string; detail: string }> = {
  mixed: {
    label: "Tổng hợp 3 kỹ năng viết",
    detail: "Trộn ngẫu nhiên Nâng cấp Band 8, Bắt lỗi ngữ pháp & Dựng câu phức",
  },
  upgrade: {
    label: "Nâng Cấp Band 5 → Band 8 (Gõ từ)",
    detail: "Tự gõ cụm học thuật thay thế câu đơn giản — nhận nhiều đồng nghĩa",
  },
  error: {
    label: "Bắt Lỗi Ngữ Pháp & Tone",
    detail: "Chạm đúng cụm sai trong câu Writing rồi chọn cách sửa chuẩn Band 8",
  },
  build: {
    label: "Dựng Câu Phức (Overview / Thesis)",
    detail: "Ghép các mảnh mệnh đề (While, Although, Not only, Bị động) thành câu Band 8",
  },
};

function parseMode(raw: string | null): LabMode {
  if (raw === "upgrade" || raw === "error" || raw === "build") return raw;
  return "mixed";
}

function parseCount(raw: string | null): LabRoundCount {
  const n = Number(raw);
  return n === 6 || n === 15 ? n : 10;
}

interface LabFeedback {
  ok: boolean;
  points: number;
  answerLine: string;
}

export default function WritingLabGame() {
  const params = useSearchParams();
  const [mode, setMode] = useState<LabMode>(() => parseMode(params.get("mode")));
  const [roundCount, setRoundCount] = useState<LabRoundCount>(() => parseCount(params.get("count")));

  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [deck, setDeck] = useState<PreparedLabChallenge[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bestAtStart, setBestAtStart] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(LAB_LIVES);

  // Per-question interaction state
  const [typed, setTyped] = useState("");
  const [hintShown, setHintShown] = useState(false);
  const [pickedSegment, setPickedSegment] = useState<number | null>(null);
  const [wrongSegments, setWrongSegments] = useState<number[]>([]);
  const [pickedFix, setPickedFix] = useState<number | null>(null);
  const [buildPick, setBuildPick] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<LabFeedback | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const autoStarted = useRef(false);
  const { scores: bestScores, saveScore } = useBestScores(BEST_KEY, BEST_EVENT);
  const bestKey = `${mode}:${roundCount}`;
  const best = bestScores[bestKey] ?? 0;
  const current = deck[index];

  const resetQuestionUi = useCallback(() => {
    setTyped("");
    setHintShown(false);
    setPickedSegment(null);
    setWrongSegments([]);
    setPickedFix(null);
    setBuildPick([]);
    setFeedback(null);
  }, []);

  const startRun = useCallback(
    (m: LabMode = mode, c: LabRoundCount = roundCount) => {
      const nextDeck = buildLabDeck(LAB_CHALLENGES, m, c);
      setDeck(nextDeck);
      setIndex(0);
      setScore(0);
      setBestAtStart(bestScores[`${m}:${c}`] ?? 0);
      setCombo(0);
      setMaxCombo(0);
      setCorrectCount(0);
      setLives(LAB_LIVES);
      resetQuestionUi();
      setPhase("playing");
    },
    [mode, roundCount, bestScores, resetQuestionUi],
  );

  useEffect(() => {
    if (params.get("autostart") !== "1" || autoStarted.current) return;
    autoStarted.current = true;
    const m = parseMode(params.get("mode"));
    const c = parseCount(params.get("count"));
    void Promise.resolve().then(() => startRun(m, c));
  }, [params, startRun]);

  useEffect(() => {
    if (phase === "playing" && current?.kind === "upgrade" && !feedback) {
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [phase, current, feedback]);

  const finishQuestion = useCallback(
    (ok: boolean, usedHint: boolean, answerLine: string) => {
      const res = scoreLabAnswer(ok, combo, usedHint);
      setCombo(res.nextCombo);
      setFeedback({ ok, points: res.points, answerLine });
      if (ok) {
        playSuccess(res.nextCombo);
        setScore((s) => s + res.points);
        setCorrectCount((n) => n + 1);
        setMaxCombo((m) => Math.max(m, res.nextCombo));
      } else {
        playError();
        setLives((l) => Math.max(0, l - 1));
      }
    },
    [combo],
  );

  const onNext = useCallback(() => {
    if (phase !== "playing" || !feedback) return;
    if (lives <= 0 || index + 1 >= deck.length) {
      saveScore(bestKey, score);
      playGameOver(lives > 0);
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    resetQuestionUi();
  }, [phase, feedback, lives, index, deck.length, saveScore, bestKey, score, resetQuestionUi]);

  // Mode 1: Submit typed Band 8 upgrade
  const onSubmitUpgrade = (event: FormEvent) => {
    event.preventDefault();
    if (!current || current.kind !== "upgrade") return;
    if (feedback) {
      onNext();
      return;
    }
    if (!typed.trim()) return;
    const ok = isUpgradeMatch(typed, current.accepted);
    const fullSentence = current.targetSentence.replace("___", current.canonical);
    finishQuestion(ok, hintShown, fullSentence);
  };

  // Mode 2: Step 1 click segment, Step 2 pick Band 8 replacement
  const onClickSegment = (segIdx: number) => {
    if (!current || current.kind !== "error" || feedback || pickedSegment === current.errorIndex) return;
    if (segIdx === current.errorIndex) {
      playKey();
      setPickedSegment(segIdx);
    } else {
      playError();
      setWrongSegments((prev) => (prev.includes(segIdx) ? prev : [...prev, segIdx]));
    }
  };

  const onPickErrorFix = useCallback(
    (fixIdx: number) => {
      if (!current || current.kind !== "error" || feedback || pickedSegment !== current.errorIndex) return;
      setPickedFix(fixIdx);
      const ok = fixIdx === current.correctDisplayFix;
      const repaired = current.segments
        .map((s, i) => (i === current.errorIndex ? current.displayFixes[current.correctDisplayFix] : s))
        .join(" ");
      finishQuestion(ok, wrongSegments.length > 0, repaired);
    },
    [current, feedback, pickedSegment, wrongSegments.length, finishQuestion],
  );

  // Mode 3: Pick/unpick phrase tiles to build complex Band 8 sentence
  const onToggleBuildTile = useCallback(
    (tileIdx: number) => {
      if (!current || current.kind !== "build" || feedback) return;
      playKey();
      setBuildPick((prev) => {
        if (prev.includes(tileIdx)) return prev.filter((id) => id !== tileIdx);
        const next = [...prev, tileIdx];
        if (next.length === current.tiles.length) {
          const ok = isBuildCorrect(next, current.tiles.length);
          finishQuestion(ok, false, current.tiles.join(" "));
        }
        return next;
      });
    },
    [current, feedback, finishQuestion],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (phase === "menu" && event.key === "Enter") {
        if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
        event.preventDefault();
        startRun();
        return;
      }
      if (phase !== "playing" || !current) return;
      if (feedback && event.key === "Enter") {
        event.preventDefault();
        onNext();
        return;
      }
      if (!feedback && current.kind === "error" && pickedSegment === current.errorIndex) {
        const num = Number(event.key);
        if (num >= 1 && num <= current.displayFixes.length) {
          event.preventDefault();
          onPickErrorFix(num - 1);
        }
      } else if (!feedback && current.kind === "build") {
        if (event.key === "Backspace" && buildPick.length > 0) {
          event.preventDefault();
          playKey();
          setBuildPick((prev) => prev.slice(0, -1));
          return;
        }
        const num = Number(event.key);
        if (num >= 1 && num <= current.shuffledOrder.length) {
          const tileIdx = current.shuffledOrder[num - 1];
          if (!buildPick.includes(tileIdx)) {
            event.preventDefault();
            onToggleBuildTile(tileIdx);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, feedback, pickedSegment, buildPick, startRun, onNext, onPickErrorFix, onToggleBuildTile]);

  const answeredTotal = Math.min(deck.length, index + (feedback ? 1 : 0));
  const accuracy = answeredTotal > 0 ? Math.round((correctCount / answeredTotal) * 100) : 100;
  const band = estimateLabBand(correctCount, deck.length || 1, maxCombo);
  const newRecord = phase === "done" && score > 0 && score > bestAtStart;

  return (
    <div className="game ws-page">
      <header className={phase === "menu" ? "hud hud-menu" : "hud"}>
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/icons/writing-lab.webp" alt="" width={30} height={30} className="brand-icon" loading="eager" unoptimized />
            <span>Paraphrase Lab</span>
          </div>
        </div>
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
                  {Array.from({ length: LAB_LIVES }, (_, i) => (
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
                Về menu
              </button>
            </div>
          </>
        )}
        {phase === "menu" && <SoundToggle />}
      </header>

      <main className="field ws-field">
        {phase === "menu" && (
          <div className="overlay">
            <div className="card ws-menu-card">
              <div className="menu-hero">
                <Image src="/icons/writing-lab.webp" alt="" width={62} height={62} className="menu-hero-icon" priority unoptimized />
                <div>
                  <h1 className="title">
                    Paraphrase <span className="accent">Lab</span>
                  </h1>
                  <p className="muted small">Luyện viết câu Band 8: tự gõ paraphrase, bắt lỗi ngữ pháp &amp; dựng câu phức</p>
                </div>
              </div>

              <fieldset className="choice">
                <legend>Chọn bài luyện viết</legend>
                <div className="ws-mode-list">
                  {(Object.keys(MODE_META) as LabMode[]).map((m) => (
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
                  {LAB_ROUND_COUNTS.map((n) => (
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

              <button type="button" className="btn primary big" onClick={() => startRun()}>
                Bắt đầu luyện viết <kbd>Enter</kbd>
              </button>
              <p className="muted tiny menu-party-foot">
                Kỷ lục chế độ này: <strong>{best.toLocaleString("vi-VN")}</strong> · Muốn soi biểu đồ Task 1?{" "}
                <Link href="/writing">Mở Writing Sprint</Link>
              </p>
            </div>
          </div>
        )}

        {phase === "playing" && current && (
          <section className="ws-stage" aria-label="Phòng luyện viết Paraphrase Lab">
            <div className="card rd-card">
              <div className="ws-play-head">
                <div className="ws-context-badges">
                  <span className="ws-pill ws-pill-task">{current.task === "task1" ? "Task 1" : "Task 2"}</span>
                  <span className="ws-tag">{current.tag}</span>
                </div>
                <span className="rd-diff-pill">
                  Câu {index + 1}/{deck.length}
                </span>
              </div>

              {/* MODE 1: UPGRADE (Type Band 8 phrase) */}
              {current.kind === "upgrade" && (
                <>
                  <div className="wl-compare">
                    <div className="wl-box wl-box-basic">
                      <span className="wl-label">Câu Band 5.5 (cần nâng cấp)</span>
                      <p>{current.basicSentence}</p>
                    </div>
                    <div className="wl-box wl-box-target">
                      <span className="wl-label">Khung Band 8 · Gợi ý: {current.meaningVi}</span>
                      <p>
                        {current.targetSentence.split("___").map((part, i, arr) => (
                          <span key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <span className="ws-blank-token">{feedback ? current.canonical : typed.trim() || "______"}</span>
                            )}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>

                  {!feedback && (
                    <form className="wl-type-form" onSubmit={onSubmitUpgrade}>
                      <input
                        ref={inputRef}
                        type="text"
                        className="type-input"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder={hintShown ? buildUpgradeHint(current.canonical) : "Gõ cụm tiếng Anh học thuật…"}
                        aria-label="Nhập cụm từ Band 8 để điền vào chỗ trống"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                      />
                      <div className="wl-type-actions">
                        <button
                          type="button"
                          className="btn"
                          disabled={hintShown}
                          onClick={() => {
                            playKey();
                            setHintShown(true);
                            inputRef.current?.focus();
                          }}
                        >
                          {hintShown ? `Gợi ý: ${buildUpgradeHint(current.canonical)}` : "Gợi ý chữ cái đầu"}
                        </button>
                        <button type="submit" className="btn primary" disabled={!typed.trim()}>
                          Kiểm tra <kbd>Enter</kbd>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* MODE 2: ERROR HUNTER */}
              {current.kind === "error" && (
                <>
                  <p className="ws-order-hint">
                    {pickedSegment === current.errorIndex
                      ? "Đã bắt trúng lỗi! Giờ chọn cách sửa chuẩn Band 8 bên dưới (phím 1–3):"
                      : "Bước 1: Chạm vào đúng cụm từ bị sai ngữ pháp hoặc thiếu học thuật trong câu:"}
                  </p>
                  <div className="wl-segments" role="group" aria-label="Các cụm từ trong câu">
                    {current.segments.map((seg, i) => {
                      const isFound = pickedSegment === i && i === current.errorIndex;
                      const isWrongTap = wrongSegments.includes(i);
                      const cls = [
                        "wl-seg",
                        isFound ? "found" : "",
                        isWrongTap ? "miss" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          key={i}
                          type="button"
                          className={cls}
                          disabled={pickedSegment === current.errorIndex || Boolean(feedback)}
                          onClick={() => onClickSegment(i)}
                        >
                          {seg}
                        </button>
                      );
                    })}
                  </div>

                  {pickedSegment === current.errorIndex && (
                    <div className="ws-choices">
                      {current.displayFixes.map((fix, i) => {
                        let cls = "ws-choice";
                        if (feedback) {
                          if (i === current.correctDisplayFix) cls += " correct";
                          else if (i === pickedFix) cls += " wrong";
                        }
                        return (
                          <button
                            key={fix}
                            type="button"
                            className={cls}
                            disabled={Boolean(feedback)}
                            onClick={() => onPickErrorFix(i)}
                          >
                            <span className="ws-choice-key">{i + 1}</span>
                            <span>{fix}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* MODE 3: BUILD COMPLEX SENTENCE */}
              {current.kind === "build" && (
                <>
                  <div className="rd-statement">
                    <span className="rd-statement-label">Mục tiêu câu Band 8</span>
                    <p>{current.promptVi}</p>
                  </div>

                  <div className="wl-build-zone" aria-label="Câu bạn đang ghép">
                    {buildPick.length === 0 ? (
                      <span className="muted small">Bấm các mảnh cụm từ bên dưới (hoặc gõ phím 1–{current.tiles.length}) theo đúng thứ tự…</span>
                    ) : (
                      buildPick.map((tileIdx, pos) => (
                        <button
                          key={tileIdx}
                          type="button"
                          className="wl-picked-chip"
                          disabled={Boolean(feedback)}
                          onClick={() => onToggleBuildTile(tileIdx)}
                          title="Bấm để bỏ mảnh này"
                        >
                          <span className="wl-chip-num">{pos + 1}</span>
                          <span>{current.tiles[tileIdx]}</span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="wl-tile-bank">
                    {current.shuffledOrder.map((tileIdx, displayIdx) => {
                      const used = buildPick.includes(tileIdx);
                      return (
                        <button
                          key={tileIdx}
                          type="button"
                          className={used ? "wl-tile used" : "wl-tile"}
                          disabled={used || Boolean(feedback)}
                          onClick={() => onToggleBuildTile(tileIdx)}
                        >
                          <span className="ws-choice-key">{displayIdx + 1}</span>
                          <span>{current.tiles[tileIdx]}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {feedback && (
                <>
                  <div className={feedback.ok ? "ws-feedback ok" : "ws-feedback bad"} role="status">
                    <div className="ws-feedback-top">
                      <strong>
                        {feedback.ok ? `Chuẩn Band 8! +${feedback.points} điểm` : "Chưa chuẩn rồi (-1 ♥)"}
                      </strong>
                      <span className="ws-takeaway">{current.takeaway}</span>
                    </div>
                    <p>
                      <strong>Câu chuẩn:</strong> {feedback.answerLine}
                    </p>
                    <p>{current.note}</p>
                  </div>
                  <button type="button" className="btn primary big" onClick={onNext}>
                    {lives <= 0 || index + 1 >= deck.length ? "Xem điểm Band →" : "Câu tiếp theo →"} <kbd>Enter</kbd>
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {phase === "done" && (
          <div className="overlay">
            <div className="card ws-done-card">
              <div className="over-head">
                <Image
                  src={newRecord || accuracy >= 80 ? "/icons/trophy.webp" : "/icons/writing-lab.webp"}
                  alt=""
                  width={60}
                  height={60}
                  className="over-icon"
                  unoptimized
                />
                <div className="over-head-info">
                  <h2>{newRecord ? "Kỷ lục mới!" : lives > 0 ? "Hoàn thành bài luyện!" : "Hết mạng rồi"}</h2>
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
                  <dt>Chính xác</dt>
                  <dd>{accuracy}%</dd>
                </div>
                <div>
                  <dt>Đúng</dt>
                  <dd>
                    {correctCount}/{deck.length}
                  </dd>
                </div>
                <div>
                  <dt>Combo tối đa</dt>
                  <dd>x{maxCombo}</dd>
                </div>
              </dl>

              <div className="actions">
                <button type="button" className="btn primary" onClick={() => startRun()}>
                  Chơi lại ngay
                </button>
                <button type="button" className="btn" onClick={() => setPhase("menu")}>
                  Đổi chế độ
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
