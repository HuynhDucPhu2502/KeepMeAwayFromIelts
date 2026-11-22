"use client";

import Image from "next/image";
import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="hub-page">
      <div className="card card-small status-card">
        <Image src="/icons/logo.webp" alt="Keep Me Away From IELTS" width={80} height={80} className="menu-hero-icon" priority unoptimized />
        <p className="badge">Ối, có trục trặc nhỏ</p>
        <h1>Trò chơi vừa bị vấp nhẹ</h1>
        <p className="muted">Đừng lo, thử tải lại màn này hoặc quay về kho game chọn chế độ khác nhé.</p>
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => reset()}>
            Thử lại
          </button>
          <Link href="/" className="btn">
            ← Về kho game
          </Link>
        </div>
      </div>
    </main>
  );
}
