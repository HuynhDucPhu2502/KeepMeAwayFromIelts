"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BOSS_EVERY, DIFFICULTIES, LIVES, type Difficulty, type Mode } from "@/lib/typing-engine";
import { HUB_GAMES, VOCAB_COUNTS, type HubGameId } from "@/lib/games-registry";
import {
  WRITING_ROUND_COUNTS,
  type WritingMode,
  type WritingRoundCount,
} from "@/lib/writing/writing-engine";

const MODES: Record<Mode, { label: string; detail: string }> = {
  words: { label: "Từ đơn", detail: `${VOCAB_COUNTS.words.toLocaleString("vi-VN")} từ hay gặp nhất trong đề IELTS` },
  phrases: { label: "Cụm từ", detail: `${VOCAB_COUNTS.phrases} cụm từ hay gặp trong Reading và Listening` },
};

const WRITING_MODES: Record<WritingMode, { label: string; detail: string }> = {
  task1: { label: "Task 1 · Soi Biểu Đồ", detail: "8 dạng biểu đồ thật: sửa xu hướng, soi số liệu" },
  task2: { label: "Task 2 · Lấp Khung & Xếp Mạch", detail: "6 dạng bài luận: collocation Band 8 & xếp 4 đoạn" },
  mixed: { label: "Tổng hợp (Task 1 + 2)", detail: "Trộn ngẫu nhiên cả biểu đồ lẫn bài luận" },
};

export default function GameHub() {
  const router = useRouter();
  const [playTab, setPlayTab] = useState<HubGameId>("typing");
  const [typingPlayMode, setTypingPlayMode] = useState<"solo" | "party">("solo");
  const [mode, setMode] = useState<Mode>("words");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
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

  const typingHref = `/typing?mode=${mode}&difficulty=${difficulty}&meaning=${showMeaning ? "1" : "0"}&autostart=1`;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
      if (playTab === "typing" && typingPlayMode === "solo") {
        event.preventDefault();
        router.push(typingHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playTab, typingPlayMode, typingHref, router]);

  return (
    <main className="hub-page">
      <div className="card hub-card">
        {/* Left: Game library */}
        <section className="hub-library" aria-label="Kho game">
          <div className="menu-hero">
            <Image src="/logo.png" alt="Keep Me Away From IELTS" width={64} height={64} className="menu-hero-icon" unoptimized />
            <div>
              <h1 className="title">
                Keep Me Away From <span className="accent">IELTS</span>
              </h1>
              <p className="muted tiny">Chọn trò chơi bên dưới rồi tuỳ chỉnh ở khung bên phải</p>
            </div>
          </div>

          <span className="hub-section-label">Kho game ({HUB_GAMES.length})</span>
          <div className="hub-game-list" role="tablist" aria-label="Danh sách trò chơi">
            {HUB_GAMES.map((g) => {
              const selected = playTab === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={selected ? "hub-game-item selected" : "hub-game-item"}
                  onClick={() => setPlayTab(g.id)}
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
          {playTab === "typing" && (
            <>
              <div className="hub-settings-head">
                <h2>Gõ từ rơi</h2>
                <div className="segmented segmented-2" role="tablist" aria-label="Chọn chơi đơn hoặc đấu phòng">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={typingPlayMode === "solo"}
                    className={typingPlayMode === "solo" ? "selected" : undefined}
                    onClick={() => setTypingPlayMode("solo")}
                  >
                    <Image src="/icons/solo.png" alt="" width={18} height={18} className="tab-icon" unoptimized />
                    <span>Chơi đơn</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={typingPlayMode === "party"}
                    className={typingPlayMode === "party" ? "selected" : undefined}
                    onClick={() => setTypingPlayMode("party")}
                  >
                    <Image src="/icons/party.png" alt="" width={18} height={18} className="tab-icon" unoptimized />
                    <span>Đấu phòng (Party)</span>
                  </button>
                </div>
              </div>

              {typingPlayMode === "solo" ? (
                <>
                  <p className="muted small">
                    Gõ các từ IELTS trước khi chạm đất, để rơi {LIVES} từ là thua. Cứ {BOSS_EVERY} map có một boss. Chữ
                    hồng có <span className="heart">♥</span> cho thêm 1 mạng.
                  </p>

                  <fieldset className="choice">
                    <legend>Chế độ</legend>
                    <div className="mode-grid">
                      {(Object.keys(MODES) as Mode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={m === mode ? "mode selected" : "mode"}
                          aria-pressed={m === mode}
                          onClick={() => setMode(m)}
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
                          onClick={() => setDifficulty(d)}
                        >
                          {DIFFICULTIES[d].label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={showMeaning}
                      onChange={(e) => setShowMeaning(e.target.checked)}
                    />
                    <span>Hiện nghĩa tiếng Việt dưới từ đang rơi</span>
                  </label>

                  <Link href={typingHref} className="btn primary big hub-cta">
                    <Image src="/icons/solo.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                    <span>Bắt đầu gõ từ rơi →</span>
                  </Link>
                </>
              ) : (
                <>
                  <p className="muted small">
                    Đấu cùng bạn bè hoặc cả hội trường (tối đa 30 người/phòng). Mọi người nhận cùng thứ tự từ — để rơi{" "}
                    {LIVES} từ là bị loại, người trụ lại cuối cùng thắng!
                  </p>

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
            </>
          )}

          {playTab === "writing" && (
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
                      className={m === writingMode ? "mode selected" : "mode"}
                      aria-pressed={m === writingMode}
                      onClick={() => setWritingMode(m)}
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
                      className={n === writingCount ? "selected" : undefined}
                      aria-pressed={n === writingCount}
                      onClick={() => setWritingCount(n)}
                    >
                      {n} câu
                    </button>
                  ))}
                </div>
              </fieldset>

              <Link
                href={`/writing?mode=${writingMode}&count=${writingCount}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/trophy.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu Writing →</span>
              </Link>
            </>
          )}

          {playTab === "listening" && (
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
                    className={listenSource === "words" ? "selected" : undefined}
                    onClick={() => setListenSource("words")}
                  >
                    Từ đơn IELTS
                  </button>
                  <button
                    type="button"
                    className={listenSource === "phrases" ? "selected" : undefined}
                    onClick={() => setListenSource("phrases")}
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
                    className={listenAccent === "en-GB" ? "selected" : undefined}
                    onClick={() => setListenAccent("en-GB")}
                  >
                    🇬🇧 Anh - Anh (UK)
                  </button>
                  <button
                    type="button"
                    className={listenAccent === "en-US" ? "selected" : undefined}
                    onClick={() => setListenAccent("en-US")}
                  >
                    🇺🇸 Anh - Mỹ (US)
                  </button>
                </div>
              </fieldset>

              {listenSource === "words" && (
                <fieldset className="choice">
                  <legend>Độ khó</legend>
                  <div className="segmented">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={d === listenDiff ? "selected" : undefined}
                        onClick={() => setListenDiff(d)}
                      >
                        {DIFFICULTIES[d].label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <Link
                href={`/listening?source=${listenSource}&accent=${listenAccent}&difficulty=${listenDiff}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/listening.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu nghe →</span>
              </Link>
            </>
          )}

          {playTab === "blitz" && (
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
                    className={blitzDir === "en-vi" ? "selected" : undefined}
                    onClick={() => setBlitzDir("en-vi")}
                  >
                    Anh → Việt
                  </button>
                  <button
                    type="button"
                    className={blitzDir === "vi-en" ? "selected" : undefined}
                    onClick={() => setBlitzDir("vi-en")}
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
                      className={d === blitzDiff ? "selected" : undefined}
                      onClick={() => setBlitzDiff(d)}
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
                      className={sec === blitzSec ? "selected" : undefined}
                      onClick={() => setBlitzSec(sec)}
                    >
                      {sec} giây
                    </button>
                  ))}
                </div>
              </fieldset>

              <Link
                href={`/blitz?dir=${blitzDir}&difficulty=${blitzDiff}&sec=${blitzSec}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/blitz.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Chạy Blitz ngay →</span>
              </Link>
            </>
          )}

          {playTab === "scramble" && (
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
                      className={d === scrambleDiff ? "selected" : undefined}
                      onClick={() => setScrambleDiff(d)}
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
                href={`/scramble?difficulty=${scrambleDiff}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/scramble.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu xếp chữ →</span>
              </Link>
            </>
          )}

          {playTab === "speaking" && (
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
                    className={speakingMode === "cloze" ? "mode selected" : "mode"}
                    onClick={() => setSpeakingMode("cloze")}
                  >
                    <strong>Lấp Khung Nói Nhanh (Part 1–3)</strong>
                    <span>Chọn idiom/collocation tự nhiên như người bản xứ</span>
                  </button>
                  <button
                    type="button"
                    className={speakingMode === "cuecard" ? "mode selected" : "mode"}
                    onClick={() => setSpeakingMode("cuecard")}
                  >
                    <strong>Thử Thách Cue Card 45 Giây (Part 2)</strong>
                    <span>Tick 4 từ khoá Band 8 khi nói &amp; nghe bài mẫu</span>
                  </button>
                </div>
              </fieldset>

              <Link
                href={`/speaking?mode=${speakingMode}&autostart=1`}
                className="btn primary big hub-cta"
              >
                <Image src="/icons/speaking.png" alt="" width={22} height={22} className="btn-icon" unoptimized />
                <span>Bắt đầu Speaking →</span>
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
