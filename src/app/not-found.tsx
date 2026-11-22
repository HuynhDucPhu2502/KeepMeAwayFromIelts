import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hub-page">
      <div className="card card-small status-card">
        <Image src="/icons/logo.webp" alt="Keep Me Away From IELTS" width={88} height={88} className="menu-hero-icon" priority unoptimized />
        <p className="badge">404 · Lạc khỏi đề rồi</p>
        <h1>Trang này không tồn tại</h1>
        <p className="muted">Có vẻ bạn vừa chạy trốn hơi xa khỏi kho đề IELTS rồi đấy. Quay về sảnh chọn game chơi tiếp nhé!</p>
        <div className="actions">
          <Link href="/" className="btn primary">
            ← Về kho 8 game
          </Link>
        </div>
      </div>
    </main>
  );
}
