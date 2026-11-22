"use client";

// Game #5: Xếp Chữ IELTS (Word Scramble) — click tiles or type letters to unscramble IELTS words from Vietnamese meaning.
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { loadCustomDeck, type CustomDeck } from "@/lib/custom-deck";
import { playError, playGameOver, playKey, playSuccess } from "@/lib/sfx";
import { loadWords } from "@/lib/vocab";
import { DIFFICULTIES, type Difficulty, type Entry } from "@/lib/typing-engine";
import {
  filterScramblePool,
  scramblePoints,
  scrambleWord,
  type LetterTile,
} from "@/lib/arcade-logic";

const LIVES = 5;

export default function ScrambleGame() {
  const params = useSearchParams();
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const d = params.get("difficulty");
    return d === "easy" || d === "normal" || d === "hard" ? d : "easy";
  });
  const [phase, setPhase] = useState<"menu" | "playing" | "done">("menu");
  const [current, setCurrent] = useState<Entry | null>(null);
  const [tiles, setTiles] = useState<LetterTile[]>([]);
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [solved, setSolved] = useState(0);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [customDeck] = useState<CustomDeck | null>(() => {
    if (params.get("deck") !== "custom") return null;
    const d = loadCustomDeck();
    if (!d) return null;
    const valid = d.entries.filter((e) => /^[a-z]{3,16}$/.test(e.text));
    return valid.length > 0 ? { name: d.name, entries: valid } : null;
  });
  const didAutostart = useRef(false);
  const poolRef = useRef<Entry[]>([]);

  const loadWord = useCallback((avoid?: string, overridePool?: Entry[]) => {
    const list = overridePool ?? poolRef.current;
    const n = list.length;
    if (n === 0) return;
    let idx = Math.floor(Math.random() * n);
    if (avoid && n > 1 && list[idx].text === avoid) idx = (idx + 1) % n;
    const entry = list[idx];
    setCurrent(entry);
    setTiles(scrambleWord(entry.text, Math.random));
    setPickedIds([]);
    setHintsUsed(0);
    setStatusMsg(null);
  }, []);

  const startRun = useCallback(() => {
    const launch = (entries: Entry[]) => {
      poolRef.current = entries;
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setLives(LIVES);
      setSolved(0);
      setPhase("playing");
      loadWord(undefined, entries);
    };
    if (customDeck) {
      launch(customDeck.entries);
      return;
    }
    void loadWords().then((words) => {
      launch(filterScramblePool(words, difficulty));
    });
  }, [customDeck, difficulty, loadWord]);

  useEffect(() => {
    if (didAutostart.current || params.get("autostart") !== "1") return;
    didAutostart.current = true;
    void Promise.resolve().then(() => startRun());
  }, [params, startRun]);

  const checkComplete = useCallback(
    (nextIds: number[], entry: Entry, tileList: LetterTile[], currentHints: number) => {
      if (nextIds.length !== entry.text.length) return;
      const attempt = nextIds.map((id) => tileList.find((t) => t.id === id)?.char ?? "").join("");
      if (attempt.toLowerCase() === entry.text.toLowerCase()) {
        const nextCombo = combo + 1;
        const pts = scramblePoints(entry.text.length, nextCombo, currentHints);
        setCombo(nextCombo);
        if (nextCombo > maxCombo) setMaxCombo(nextCombo);
        playSuccess(nextCombo);
        setScore((s) => s + pts);
        setSolved((c) => c + 1);
        setStatusMsg({ ok: true, text: `Tuyệt vời! “${entry.text}” (+${pts} điểm)` });
      } else {
        playError();
        const nextLives = Math.max(0, lives - 1);
        setCombo(0);
        setLives(nextLives);
        setStatusMsg({ ok: false, text: `Chưa đúng (-1 ♥) — Đáp án là “${entry.text}”` });
      }
    },
    [combo, maxCombo, lives],
  );

  const onPickTile = useCallback(
    (tileId: number) => {
      if (!current || statusMsg || pickedIds.includes(tileId)) return;
      playKey();
      const next = [...pickedIds, tileId];
      setPickedIds(next);
      checkComplete(next, current, tiles, hintsUsed);
    },
    [current, statusMsg, pickedIds, checkComplete, tiles, hintsUsed],
  );

  const onUnpickSlot = useCallback(
    (slotIdx: number) => {
      if (statusMsg) return;
      setPickedIds((prev) => prev.filter((_, i) => i !== slotIdx));
    },
    [statusMsg],
  );

  const onHint = useCallback(() => {
    if (!current || statusMsg) return;
    const target = current.text.toLowerCase();
    // Keep any already-correct prefix, then place the next right letter
    let matchLen = 0;
    while (
      matchLen < pickedIds.length &&
      tiles.find((t) => t.id === pickedIds[matchLen])?.char === target[matchLen]
    ) {
      matchLen++;
    }
    const prefix = pickedIds.slice(0, matchLen);
    const neededChar = target[matchLen];
    const nextTile = tiles.find((t) => t.char === neededChar && !prefix.includes(t.id));
    if (!nextTile) return;
    const nextHints = hintsUsed + 1;
    const nextIds = [...prefix, nextTile.id];
    setHintsUsed(nextHints);
    setCombo(0);
    setPickedIds(nextIds);
    checkComplete(nextIds, current, tiles, nextHints);
  }, [current, statusMsg, pickedIds, tiles, hintsUsed, checkComplete]);

  const onNext = useCallback(() => {
    if (!current) return;
    if (lives <= 0) {
      playGameOver(false);
      setPhase("done");
    } else loadWord(current.text);
  }, [current, lives, loadWord]);

  // Direct keyboard typing & Backspace / Enter support!
  useEffect(() => {
    if (phase !== "playing" || !current) return;
    const onKey = (e: KeyboardEvent) => {
      if (statusMsg) {
        if (e.key === "Enter") {
          e.preventDefault();
          onNext();
        }
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setPickedIds((prev) => prev.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        const ch = e.key.toLowerCase();
        const found = tiles.find((t) => t.char === ch && !pickedIds.includes(t.id));
        if (found) {
          e.preventDefault();
          onPickTile(found.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, statusMsg, tiles, pickedIds, onPickTile, onNext]);

  return (
    <div className="game ws-page">
      <header className={phase === "menu" ? "hud hud-menu" : "hud"}>
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/icons/scramble.webp" alt="" width={30} height={30} className="brand-icon" loading="eager" unoptimized />
            <span>{customDeck ? `Xếp Chữ · ${customDeck.name}` : "Xếp Chữ IELTS"}</span>
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
                <dt>Giải được</dt>
                <dd>{solved}</dd>
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
                <Image src="/icons/scramble.webp" alt="" width={62} height={62} className="menu-hero-icon" priority unoptimized />
                <div>
                  <h1 className="title">
                    Xếp Chữ <span className="accent">IELTS</span>
                  </h1>
                  <p className="muted small">Nhìn nghĩa tiếng Việt rồi ghép các chữ cái bị xáo trộn (bấm hoặc gõ phím)</p>
                </div>
              </div>

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

              <button type="button" className="btn primary big" onClick={startRun}>
                Bắt đầu xếp chữ
              </button>
              <p className="muted tiny menu-party-foot">
                <Link href="/">← Quay lại Kho game</Link>
              </p>
            </div>
          </div>
        )}

        {phase === "playing" && current && (
          <div className="ws-stage">
            <div className="card arcade-card">
              <div className="ws-play-head">
                <span className="ws-tag">Ghép chữ cái · Gõ phím hoặc bấm thẻ</span>
                <span className="muted tiny">{current.text.length} chữ cái</span>
              </div>

              <div className="scramble-meaning">{current.meaning}</div>

              {/* Answer slots */}
              <div className="scramble-slots" aria-label="Ô đáp án">
                {Array.from({ length: current.text.length }, (_, i) => {
                  const tid = pickedIds[i];
                  const tile = tid != null ? tiles.find((t) => t.id === tid) : undefined;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={tile ? "scramble-slot filled" : "scramble-slot"}
                      disabled={!tile || !!statusMsg}
                      onClick={() => onUnpickSlot(i)}
                    >
                      {tile ? tile.char.toUpperCase() : ""}
                    </button>
                  );
                })}
              </div>

              {/* Letter bank */}
              <div className="scramble-bank" aria-label="Kho chữ cái">
                {tiles.map((t) => {
                  const used = pickedIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={used ? "scramble-tile used" : "scramble-tile"}
                      disabled={used || !!statusMsg}
                      onClick={() => onPickTile(t.id)}
                    >
                      {t.char.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {statusMsg ? (
                <>
                  <div className={statusMsg.ok ? "ws-feedback ok" : "ws-feedback bad"}>
                    <strong>{statusMsg.text}</strong>
                  </div>
                  <button type="button" className="btn primary big" onClick={onNext}>
                    {lives <= 0 ? "Xem kết quả" : "Từ tiếp theo"} <kbd>Enter</kbd>
                  </button>
                </>
              ) : (
                <div className="actions">
                  <button type="button" className="btn btn-sm" onClick={onHint}>
                    💡 Gợi ý 1 chữ
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={pickedIds.length === 0}
                    onClick={() => setPickedIds([])}
                  >
                    Xoá hết
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="overlay">
            <div className="card over-card">
              <div className="over-head">
                <Image src="/icons/scramble.webp" alt="" width={60} height={60} className="over-icon" unoptimized />
                <div className="over-head-info">
                  <h2>Hoàn thành Xếp Chữ!</h2>
                  <p className="final-score">{score.toLocaleString("vi-VN")}</p>
                </div>
              </div>
              <dl className="summary">
                <div>
                  <dt>Giải được</dt>
                  <dd>{solved}</dd>
                </div>
                <div>
                  <dt>Combo max</dt>
                  <dd>x{maxCombo}</dd>
                </div>
                <div>
                  <dt>Độ khó</dt>
                  <dd>{DIFFICULTIES[difficulty].label}</dd>
                </div>
              </dl>
              <button type="button" className="btn primary big" onClick={startRun}>
                Chơi lượt mới
              </button>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setPhase("menu")}>
                  Đổi độ khó
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
