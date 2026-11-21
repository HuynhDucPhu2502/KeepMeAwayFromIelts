import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import SpeakingGame from "./_components/SpeakingGame";

export const metadata = pageMetadata({
  title: "Phản Xạ Speaking",
  description:
    "Luyện cụm từ nói tự nhiên IELTS Speaking Part 1–3 dạng điền từ và thử thách Cue Card 45 giây có chấm từ khóa.",
  path: "/speaking",
  keywords: [
    "luyện IELTS Speaking",
    "IELTS Speaking Part 2 Cue Card",
    "từ vựng IELTS Speaking Part 1 2 3",
    "phản xạ nói tiếng Anh",
  ],
});

export default function SpeakingPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <SpeakingGame />
    </Suspense>
  );
}
