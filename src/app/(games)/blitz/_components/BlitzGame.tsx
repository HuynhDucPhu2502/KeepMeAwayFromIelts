"use client";

// Game #4: Nối Nghĩa Tốc Độ (Vocab Blitz) — 30s / 60s / 90s rapid-fire quiz with Fever Mode x2!
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { loadCustomDeck, type CustomDeck } from "@/lib/custom-deck";
import { playError, playFever, playGameOver, playSuccess, playTick } from "@/lib/sfx";
import { loadWords } from "@/lib/vocab";
import { DIFFICULTIES, type Difficulty, type Entry } from "@/lib/typing-engine";
import {
  blitzReward,
  buildBlitzQuestion,
  filterBlitzPool,
  type BlitzDirection,
  type BlitzQuestion,
} from "@/lib/arcade-logic";

const DURATIONS = [30, 60, 90] as const;

export default function BlitzGame() {
  const params = useSearchParams();
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const d = params.get("difficulty");
    return d === "easy" || d === "normal" || d === "hard" ? d : "easy";
  });
  const [direction, setDirection] = useState<BlitzDirection>(() =>
    params.get("dir") === "vi-en" ? "vi-en" : "en-vi",
  );
  const [duration, setDuration] = useState<number>(() => {
    const n = Number(params.get("sec"));
    return n === 30 || n === 60 || n === 90 ? n : 60;
  });
  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [question, setQuestion] = useState<BlitzQuestion | null>(null);
  const [flash, setFlash] = useState<{ idx: number; ok: boolean; bonusSec: number } | null>(null);
  const [customDeck] = useState<CustomDeck | null>(() => {
    if (params.get("deck") !== "custom") return null;
    const d = loadCustomDeck();
    if (!d) return null;
    const withMeaning = d.entries.filter((e) => (e.meaning ?? "").trim().length > 0);
    return withMeaning.length >= 4 ? { name: d.name, entries: withMeaning } : null;
  });
  const didAutostart = useRef(false);
  const poolRef = useRef<Entry[]>([]);

  const startRun = useCallback(() => {
    const launch = (entries: Entry[]) => {
      poolRef.current = entries;
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
      setCorrect(0);
      setTotal(0);
      setTimeLeft(duration);
      setFlash(null);
      setQuestion(buildBlitzQuestion(entries, direction, Math.random));
      setPhase("playing");
    };
    if (customDeck) {
      launch(customDeck.entries);
      return;
    }
    void loadWords().then((words) => {
      launch(filterBlitzPool(words, difficulty));
    });
  }, [duration, customDeck, difficulty, direction]);

  useEffect(() => {
    if (didAutostart.current || params.get("autostart") !== "1") return;
    didAutostart.current = true;
    void Promise.resolve().then(() => startRun());
  }, [params, startRun]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          playGameOver(true);
          setPhase("done");
          return 0;
        }
        if (t <= 6) playTick();
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const onPick = useCallback(
    (idx: number) => {
      if (!question || flash || phase !== "playing") return;
      const ok = idx === question.correctIndex;
      setTotal((t) => t + 1);
      if (ok) {
        const nextStreak = streak + 1;
        const { points, bonusSec } = blitzReward(nextStreak);
        if (nextStreak === 5 || bonusSec > 0) playFever();
        else playSuccess(nextStreak);
        setStreak(nextStreak);
        if (nextStreak > maxStreak) setMaxStreak(nextStreak);
        setScore((s) => s + points);
        setCorrect((c) => c + 1);
        if (bonusSec > 0) setTimeLeft((t) => t + bonusSec);
        setFlash({ idx, ok: true, bonusSec });
      } else {
        playError();
        setStreak(0);
        setFlash({ idx, ok: false, bonusSec: 0 });
      }
      window.setTimeout(() => {
        setFlash(null);
        setQuestion((prev) => buildBlitzQuestion(poolRef.current, direction, Math.random, prev?.entry.text));
      }, ok ? 240 : 520);
    },
    [question, flash, phase, streak, maxStreak, direction],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) {
        e.preventDefault();
        onPick(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onPick]);

  const fever = streak >= 5;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;

  return (
    <div className="game ws-page">
      <header className={phase === "menu" ? "hud hud-menu" : "hud"}>
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/icons/blitz.webp" alt="" width={30} height={30} className="brand-icon" loading="eager" unoptimized />
            <span>{customDeck ? `Blitz · ${customDeck.name}` : "Nối Nghĩa Tốc Độ"}</span>
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
                <dt>Chuỗi</dt>
                <dd className={fever ? "hot" : undefined}>
                  x{streak}
                  {fever ? " 🔥" : ""}
                </dd>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd className={timeLeft <= 10 ? "boss-map" : undefined}>{timeLeft}s</dd>
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
                <Image src="/icons/blitz.webp" alt="" width={62} height={62} className="menu-hero-icon" priority unoptimized />
                <div>
                  <h1 className="title">
                    Nối Nghĩa <span className="accent">Tốc Độ</span>
                  </h1>
                  <p className="muted small">Phản xạ nhanh 4 đáp án · chuỗi 5 bật Fever x2 điểm &amp; +2 giây!</p>
                </div>
              </div>

              <fieldset className="choice">
                <legend>Chiều nối nghĩa</legend>
                <div className="segmented segmented-2">
                  <button
                    type="button"
                    className={direction === "en-vi" ? "selected" : undefined}
                    onClick={() => setDirection("en-vi")}
                  >
                    Anh → Việt
                  </button>
                  <button
                    type="button"
                    className={direction === "vi-en" ? "selected" : undefined}
                    onClick={() => setDirection("vi-en")}
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
                      className={difficulty === d ? "selected" : undefined}
                      onClick={() => setDifficulty(d)}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="choice">
                <legend>Thời gian</legend>
                <div className="segmented">
                  {DURATIONS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={duration === sec ? "selected" : undefined}
                      onClick={() => setDuration(sec)}
                    >
                      {sec} giây
                    </button>
                  ))}
                </div>
              </fieldset>

              <button type="button" className="btn primary big" onClick={startRun}>
                Chạy ngay!
              </button>
              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Kho game</Link>
              </p>
            </div>
          </div>
        )}

        {phase === "playing" && question && (
          <div className="ws-stage">
            <div className={fever ? "card arcade-card blitz-fever" : "card arcade-card"}>
              <div className="ws-play-head">
                <span className="ws-tag">{fever ? "🔥 FEVER MODE · x2 ĐIỂM" : "Phản xạ nhanh · Phím 1–4"}</span>
                {flash && flash.bonusSec > 0 && <span className="ws-pill ws-pill-task">+{flash.bonusSec}s thưởng!</span>}
              </div>

              <div className="blitz-prompt">{question.prompt}</div>

              <div className="blitz-grid">
                {question.choices.map((label, i) => {
                  let cls = "ws-choice";
                  if (flash) {
                    if (i === question.correctIndex) cls += " correct";
                    else if (i === flash.idx && !flash.ok) cls += " wrong";
                  }
                  return (
                    <button key={`${question.prompt}-${i}`} type="button" className={cls} onClick={() => onPick(i)}>
                      <span className="ws-choice-key">{i + 1}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="overlay">
            <div className="card over-card">
              <div className="over-head">
                <Image src="/icons/blitz.webp" alt="" width={60} height={60} className="over-icon" unoptimized />
                <div className="over-head-info">
                  <h2>Hết giờ Blitz!</h2>
                  <p className="final-score">{score.toLocaleString("vi-VN")}</p>
                </div>
              </div>
              <dl className="summary">
                <div>
                  <dt>Đúng</dt>
                  <dd>
                    {correct}/{total}
                  </dd>
                </div>
                <div>
                  <dt>Chính xác</dt>
                  <dd>{accuracy}%</dd>
                </div>
                <div>
                  <dt>Chuỗi max</dt>
                  <dd>x{maxStreak}</dd>
                </div>
              </dl>
              <button type="button" className="btn primary big" onClick={startRun}>
                Chơi lại {duration}s
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
