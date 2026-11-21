"use client";

// Custom Word Deck Studio: paste/edit personal IELTS word lists, share via URL token (no DB needed),
// and launch directly into Typing, Listening, Blitz, or Scramble!
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import {
  MAX_CUSTOM_DECK_WORDS,
  SAMPLE_DECKS,
  clearCustomDeck,
  decodeDeck,
  encodeDeck,
  formatDeckText,
  loadCustomDeck,
  parseDeckText,
  saveCustomDeck,
  type CustomDeck,
} from "@/lib/custom-deck";
import { playKey, playSuccess } from "@/lib/sfx";

export default function DeckBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const sharedToken = params.get("d");

  const [deckName, setDeckName] = useState("Bộ từ IELTS của tôi");
  const [rawText, setRawText] = useState(() => formatDeckText(SAMPLE_DECKS[0].entries));
  const [sharedBanner, setSharedBanner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // On mount / when ?d= changes, load shared deck from URL or saved deck from localStorage.
  useEffect(() => {
    if (sharedToken) {
      const decoded = decodeDeck(sharedToken);
      if (decoded) {
        saveCustomDeck(decoded);
        void Promise.resolve().then(() => {
          setDeckName(decoded.name);
          setRawText(formatDeckText(decoded.entries));
          setSharedBanner(`Đã mở bộ từ được chia sẻ: “${decoded.name}” (${decoded.entries.length} từ)`);
        });
        return;
      }
    }
    const saved = loadCustomDeck();
    if (saved) {
      void Promise.resolve().then(() => {
        setDeckName(saved.name);
        setRawText(formatDeckText(saved.entries));
      });
    }
  }, [sharedToken]);

  const parsed = useMemo(() => parseDeckText(rawText), [rawText]);
  const { entries, skipped } = parsed;
  const meaningCount = useMemo(() => entries.filter((e) => (e.meaning ?? "").length > 0).length, [entries]);
  const scrambleEligible = useMemo(
    () => entries.filter((e) => /^[a-z]{3,16}$/.test(e.text)).length,
    [entries],
  );

  const buildDeck = (): CustomDeck => ({
    name: deckName.trim() || "Bộ từ riêng",
    entries,
  });

  const onApplySample = (sample: CustomDeck) => {
    playKey();
    setDeckName(sample.name);
    setRawText(formatDeckText(sample.entries));
    setSharedBanner(null);
    setCopied(false);
  };

  const onClear = () => {
    playKey();
    setDeckName("Bộ từ IELTS của tôi");
    setRawText("");
    setSharedBanner(null);
    setCopied(false);
    clearCustomDeck();
  };

  const onCopyShareLink = () => {
    if (entries.length === 0) return;
    const deck = buildDeck();
    saveCustomDeck(deck);
    const token = encodeDeck(deck);
    const url = `${window.location.origin}/deck?d=${token}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        playSuccess(2);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2600);
      })
      .catch(() => {});
  };

  const onLaunchGame = (path: string) => {
    if (entries.length === 0) return;
    playKey();
    saveCustomDeck(buildDeck());
    router.push(`${path}?deck=custom&autostart=1`);
  };

  return (
    <div className="game ws-page">
      <header className="hud">
        <div className="hud-left">
          <Link href="/" className="hud-back">
            ← Kho game
          </Link>
          <div className="hud-brand">
            <Image src="/logo.png" alt="Keep Me Away From IELTS" width={30} height={30} className="brand-icon" unoptimized />
            <span>Bộ từ riêng &amp; Chia sẻ</span>
          </div>
        </div>
        <SoundToggle />
      </header>

      <main className="field ws-field">
        <section className="ws-stage">
          <div className="ws-card deck-card">
            <div className="deck-head">
              <div>
                <span className="ws-tag">Custom Deck · 0đ không cần đăng nhập</span>
                <h1 className="deck-title">Tự tạo bộ từ &amp; chia sẻ bằng Link</h1>
                <p className="muted small">
                  Dán danh sách từ vựng của bạn hoặc giáo viên (mỗi dòng 1 từ, hỗ trợ copy thẳng từ Excel / Google
                  Sheets), rồi chơi ngay trên 4 mini-game hoặc tạo link gửi cả lớp!
                </p>
              </div>
            </div>

            {sharedBanner && (
              <div className="ws-feedback ok">
                <strong>{sharedBanner}</strong>
                <p>Bấm chọn bất kỳ game nào bên dưới để luyện tập ngay bộ từ này!</p>
              </div>
            )}

            <div className="deck-presets">
              <span className="hub-section-label">Bộ mẫu nhanh:</span>
              <div className="deck-preset-row">
                {SAMPLE_DECKS.map((s) => (
                  <button key={s.name} type="button" className="deck-preset-btn" onClick={() => onApplySample(s)}>
                    {s.name} ({s.entries.length})
                  </button>
                ))}
                <button type="button" className="deck-preset-btn clear" onClick={onClear}>
                  Xoá trắng
                </button>
              </div>
            </div>

            <div className="deck-editor-grid">
              <div className="deck-form">
                <label className="deck-field">
                  <span>Tên bộ từ</span>
                  <input
                    type="text"
                    className="deck-input"
                    value={deckName}
                    maxLength={60}
                    onChange={(e) => {
                      setDeckName(e.target.value);
                      setCopied(false);
                    }}
                    placeholder="VD: Từ vựng Unit 4 · Environment"
                  />
                </label>

                <label className="deck-field">
                  <span>
                    Danh sách từ (tối đa {MAX_CUSTOM_DECK_WORDS} từ · định dạng <code>từ - nghĩa</code> hoặc copy từ
                    Excel)
                  </span>
                  <textarea
                    className="deck-textarea"
                    rows={10}
                    value={rawText}
                    onChange={(e) => {
                      setRawText(e.target.value);
                      setCopied(false);
                    }}
                    placeholder={"mitigate - giảm thiểu tác động xấu\nsustainable - bền vững\nubiquitous: có mặt khắp nơi"}
                    spellCheck={false}
                  />
                </label>
              </div>

              <div className="deck-preview">
                <div className="deck-preview-head">
                  <strong>
                    Đã nhận diện: <span className="accent">{entries.length}</span> từ
                  </strong>
                  {skipped > 0 && <span className="muted tiny">({skipped} dòng bỏ qua)</span>}
                </div>

                {entries.length === 0 ? (
                  <p className="muted small">
                    Chưa có từ hợp lệ nào. Hãy nhập từ tiếng Anh (ít nhất 2 chữ cái), ví dụ: <code>resilient - kiên cường</code>.
                  </p>
                ) : (
                  <ul className="deck-chip-list">
                    {entries.map((item) => (
                      <li key={item.text} className="deck-chip">
                        <strong>{item.text}</strong>
                        {item.meaning && <span>{item.meaning}</span>}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="deck-share-box">
                  <button
                    type="button"
                    className="btn big deck-share-btn"
                    disabled={entries.length === 0}
                    onClick={onCopyShareLink}
                  >
                    {copied ? "✓ Đã copy link chia sẻ!" : "🔗 Copy link chia sẻ bộ từ này"}
                  </button>
                  <p className="muted tiny">
                    Toàn bộ từ vựng được nén gọn ngay trong URL — bạn bè hoặc học sinh mở link là chơi được liền!
                  </p>
                </div>
              </div>
            </div>

            <div className="deck-launch">
              <span className="hub-section-label">Chơi ngay với bộ từ này ({entries.length} từ)</span>
              <div className="deck-launch-grid">
                <button
                  type="button"
                  className="deck-launch-btn"
                  disabled={entries.length === 0}
                  onClick={() => onLaunchGame("/typing")}
                >
                  <Image src="/icons/solo.png" alt="" width={34} height={34} unoptimized />
                  <div>
                    <strong>Gõ từ rơi</strong>
                    <span>Luyện phản xạ gõ nhanh</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="deck-launch-btn"
                  disabled={entries.length === 0}
                  onClick={() => onLaunchGame("/listening")}
                >
                  <Image src="/icons/listening.png" alt="" width={34} height={34} unoptimized />
                  <div>
                    <strong>Nghe &amp; Gõ</strong>
                    <span>Nghe phát âm UK/US &amp; viết chính tả</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="deck-launch-btn"
                  disabled={meaningCount < 4}
                  onClick={() => onLaunchGame("/blitz")}
                >
                  <Image src="/icons/blitz.png" alt="" width={34} height={34} unoptimized />
                  <div>
                    <strong>Nối Nghĩa Tốc Độ</strong>
                    <span>
                      {meaningCount >= 4 ? "Đua 60s 4 đáp án · Fever x2" : `Cần ít nhất 4 từ có nghĩa (${meaningCount}/4)`}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="deck-launch-btn"
                  disabled={scrambleEligible === 0}
                  onClick={() => onLaunchGame("/scramble")}
                >
                  <Image src="/icons/scramble.png" alt="" width={34} height={34} unoptimized />
                  <div>
                    <strong>Xếp Chữ IELTS</strong>
                    <span>
                      {scrambleEligible > 0
                        ? `Ghép chữ cái (${scrambleEligible} từ đơn hợp lệ)`
                        : "Cần ít nhất 1 từ đơn 3–16 chữ cái"}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
