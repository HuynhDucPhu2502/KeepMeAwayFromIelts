import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import TypingGame from "./_components/TypingGame";

export const metadata = pageMetadata({
  title: "Gõ Từ Rơi IELTS",
  description:
    "Game gõ từ vựng & cụm từ IELTS rơi miễn phí: 5.785 từ học thuật, 307 cụm Reading/Listening, Boss mỗi 5 map và hồi máu ♥.",
  path: "/typing",
  keywords: [
    "gõ từ rơi IELTS",
    "typing game IELTS",
    "luyện gõ tiếng Anh",
    "học từ vựng IELTS nhanh",
  ],
});

export default function TypingPage() {
  return (
    <Suspense fallback={<div className="game" />}>
      <TypingGame />
    </Suspense>
  );
}
