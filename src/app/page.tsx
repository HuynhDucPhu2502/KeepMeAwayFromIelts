import Link from "next/link";
import { HUB_GAMES, VOCAB_COUNTS } from "@/lib/games-registry";
import GameHub from "./_components/GameHub";

const FAQ_ITEMS = [
  {
    q: "Keep Me Away From IELTS có miễn phí và cần đăng ký tài khoản không?",
    a: "Hoàn toàn miễn phí 100% và không cần tạo tài khoản. Bạn mở web lên là chơi ngay cả 7 mini-game học IELTS, lưu kỷ lục ngay trên trình duyệt và tự tạo phòng Party đấu cùng bạn bè.",
  },
  {
    q: "Web luyện được những kỹ năng IELTS nào?",
    a: `Đủ trọn bộ 4 kỹ năng IELTS và từ vựng học thuật: Từ vựng (${VOCAB_COUNTS.words.toLocaleString("vi-VN")} từ & ${VOCAB_COUNTS.phrases} cụm từ), Reading (True / False / Not Given có highlight dẫn chứng), Writing (8 biểu đồ Task 1 & 6 dạng luận Task 2), Listening (nghe chép chính tả giọng UK/US) và Speaking (Part 1–3 kèm Micro chấm từ khóa Part 2).`,
  },
  {
    q: "Giáo viên hoặc người học có thể tự nhập danh sách từ riêng để chơi không?",
    a: "Có! Ở trang Bộ từ riêng (/deck), bạn chỉ cần dán danh sách từ tiếng Anh kèm nghĩa (hỗ trợ copy thẳng từ Excel/Google Sheets), rồi bấm tạo link chia sẻ để cả lớp bấm vào chơi ngay trên 4 game từ vựng mà không cần cơ sở dữ liệu.",
  },
  {
    q: "Chế độ Đấu phòng Party hỗ trợ tối đa bao nhiêu người chơi cùng lúc?",
    a: "Mỗi phòng Party hỗ trợ 2–30 người cùng gõ chung một thứ tự từ theo thời gian thực, hỗ trợ nhiều phòng chạy song song, tham gia bằng mã 4 ký tự hoặc quét QR và tùy chọn thời lượng từ 3–30 phút hoặc đấu loại tới người cuối cùng còn sống.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <GameHub />

      {/* Below-the-fold SSR semantic content, internal links & FAQ for search engines and learners */}
      <section className="seo-section" aria-label="Giới thiệu kho mini-game học IELTS">
        <div className="seo-container">
          <div className="seo-intro">
            <h2>Học IELTS không nhàm chán với 7 mini-game đủ 4 kỹ năng</h2>
            <p>
              <strong>Keep Me Away From IELTS</strong> biến {VOCAB_COUNTS.words.toLocaleString("vi-VN")} từ vựng học
              thuật, {VOCAB_COUNTS.phrases} cụm Reading/Listening và các dạng bẫy kinh điển của bài thi IELTS thành 7
              trò chơi phản xạ nhanh — giúp bạn ôn luyện mỗi ngày ngay trên trình duyệt mà không cần cài app.
            </p>
          </div>

          <nav className="seo-links-grid" aria-label="Liên kết nhanh các trò chơi IELTS">
            {HUB_GAMES.map((g) => (
              <Link key={g.id} href={g.path} className="seo-link-card">
                <span className="hub-game-badge">{g.badge}</span>
                <h3>{g.title}</h3>
                <p>{g.subtitle}</p>
              </Link>
            ))}
            <Link href="/deck" className="seo-link-card">
              <span className="hub-game-badge">Custom Deck</span>
              <h3>Bộ từ riêng &amp; Chia sẻ link</h3>
              <p>Dán danh sách từ vựng cá nhân hoặc lớp học, chơi ngay &amp; chia sẻ qua URL.</p>
            </Link>
            <Link href="/party" className="seo-link-card">
              <span className="hub-game-badge">Multiplayer</span>
              <h3>Đấu phòng Party 2–30 người</h3>
              <p>Tạo phòng nhanh bằng mã 4 ký tự hoặc QR, so tốc độ gõ từ vựng thời gian thực.</p>
            </Link>
          </nav>

          <div className="seo-faq">
            <h2>Câu hỏi thường gặp</h2>
            <div className="seo-faq-list">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="seo-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
