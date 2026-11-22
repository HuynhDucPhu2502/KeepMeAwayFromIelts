"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HUB_GAMES, VOCAB_COUNTS, type SkillCategory } from "@/lib/games-registry";

interface HubCardItem {
  id: string;
  path: string;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  skill: Exclude<SkillCategory, "all">;
  highlights: string[];
  cta: string;
  isNew?: boolean;
}

const EXTRA_CARDS: HubCardItem[] = [
  {
    id: "party",
    path: "/party",
    icon: "/icons/party.webp",
    title: "Đấu Phòng Party",
    subtitle: "Thi gõ từ vựng Battle Royale 2–30 người cùng lúc bằng mã phòng 4 ký tự hoặc quét QR.",
    badge: "Multiplayer",
    skill: "tools",
    highlights: ["2–30 người/phòng", "Mã 4 ký tự & QR"],
    cta: "Vào / Tạo phòng →",
  },
  {
    id: "deck",
    path: "/deck",
    icon: "/icons/mascot.webp",
    title: "Bộ Từ Riêng",
    subtitle: "Dán danh sách từ vựng cá nhân hoặc lớp học từ Excel/Sheets, chơi ngay và chia sẻ bằng link.",
    badge: "Custom Deck",
    skill: "tools",
    highlights: ["Copy thẳng từ Excel", "Chia sẻ bằng URL"],
    cta: "Tạo bộ từ →",
  },
];

const ALL_CARDS: HubCardItem[] = [
  ...HUB_GAMES.map((g) => ({
    id: g.id,
    path: g.path,
    icon: g.icon,
    title: g.title,
    subtitle: g.subtitle,
    badge: g.badge,
    skill: g.skill,
    highlights: g.highlights,
    cta: "Chơi ngay →",
    isNew: g.isNew,
  })),
  ...EXTRA_CARDS,
];

const SKILL_FILTERS: { id: SkillCategory; label: string }[] = [
  { id: "all", label: `Tất cả (${ALL_CARDS.length})` },
  { id: "writing", label: "Writing (2)" },
  { id: "reading", label: "Reading" },
  { id: "listening", label: "Listening" },
  { id: "speaking", label: "Speaking" },
  { id: "vocab", label: "Từ vựng (3)" },
  { id: "tools", label: "Party & Bộ từ" },
];

export default function GameHub() {
  const [skill, setSkill] = useState<SkillCategory>("all");

  const visibleCards = skill === "all" ? ALL_CARDS : ALL_CARDS.filter((item) => item.skill === skill);

  return (
    <div className="hub-shell">
      <header className="hub-topbar">
        <Link href="/" className="hub-brand-link">
          <Image
            src="/icons/logo.webp"
            alt="Keep Me Away From IELTS"
            width={40}
            height={40}
            className="hub-brand-logo"
            priority
            unoptimized
          />
          <span className="hub-brand-text">
            Keep Me Away From <span className="accent">IELTS</span>
          </span>
        </Link>

        <nav className="hub-top-nav" aria-label="Điều hướng nhanh">
          <Link href="/writing-lab" className="hub-nav-link">
            Paraphrase Lab
          </Link>
          <Link href="/party" className="hub-nav-link">
            Đấu phòng Party
          </Link>
          <Link href="/party/host" className="hub-nav-link">
            Màn hình Host
          </Link>
          <Link href="/deck" className="hub-nav-link hub-nav-cta">
            + Bộ từ riêng
          </Link>
        </nav>
      </header>

      <main className="hub-main">
        <section className="hub-hero-bar" aria-label="Chọn trò chơi học IELTS">
          <div className="hub-hero-copy">
            <h1 className="hub-hero-title">
              Chọn trò chơi luyện <span className="accent">IELTS</span> đủ 4 kỹ năng
            </h1>
            <p className="muted small">
              {HUB_GAMES.length} mini-game miễn phí · {VOCAB_COUNTS.words.toLocaleString("vi-VN")} từ học thuật &amp;{" "}
              {VOCAB_COUNTS.phrases} cụm Reading/Listening · Bấm vào từng game để mở trang chơi riêng.
            </p>
          </div>

          <div className="hub-filter-bar" role="tablist" aria-label="Lọc game theo kỹ năng IELTS">
            {SKILL_FILTERS.map((f) => {
              const active = skill === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "hub-filter-pill selected" : "hub-filter-pill"}
                  onClick={() => setSkill(f.id)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="hub-grid-section" aria-label="Danh sách trò chơi">
          <div className="hub-grid">
            {visibleCards.map((item) => (
              <Link key={item.id} href={item.path} className="hub-tile">
                <div className="hub-tile-head">
                  <Image
                    src={item.icon}
                    alt=""
                    width={48}
                    height={48}
                    className="hub-tile-icon"
                    loading="eager"
                    unoptimized
                  />
                  <div className="hub-tile-badges">
                    <span className="hub-game-badge">{item.badge}</span>
                    {item.isNew && <span className="hub-new-badge">Mới</span>}
                  </div>
                </div>

                <div className="hub-tile-body">
                  <h2>{item.title}</h2>
                  <p>{item.subtitle}</p>
                </div>

                <div className="hub-tile-tags">
                  {item.highlights.map((tag) => (
                    <span key={tag} className="hub-tag-chip">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="hub-tile-foot">
                  <span className="hub-tile-cta">{item.cta}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
