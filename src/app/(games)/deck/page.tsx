import { Suspense } from "react";
import { GameJsonLd } from "@/app/_components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import DeckBuilder from "./_components/DeckBuilder";

export const metadata = pageMetadata({
  title: "Bộ Từ Riêng · Chia Sẻ Bằng Link",
  description:
    "Tự dán danh sách từ vựng tiếng Anh của bạn hoặc giáo viên, chơi ngay trên 4 mini-game IELTS và chia sẻ bằng 1 đường link không cần đăng nhập.",
  path: "/deck",
  keywords: [
    "tự tạo bộ từ vựng IELTS",
    "học từ vựng theo danh sách riêng",
    "chia sẻ bộ từ vựng cho lớp học",
    "custom vocabulary game",
  ],
});

export default function DeckPage() {
  return (
    <>
      <GameJsonLd
        name="Bộ Từ Riêng · Chia Sẻ Bằng Link"
        description="Tự dán danh sách từ vựng tiếng Anh của bạn hoặc giáo viên, chơi ngay trên 4 mini-game IELTS và chia sẻ qua 1 đường link."
        path="/deck"
        skill="Custom IELTS Vocabulary Deck Practice"
      />
      <Suspense fallback={<div className="game ws-page" />}>
        <DeckBuilder />
      </Suspense>
    </>
  );
}
