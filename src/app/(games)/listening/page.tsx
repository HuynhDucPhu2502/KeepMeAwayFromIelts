import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import ListeningGame from "./_components/ListeningGame";

export const metadata = pageMetadata({
  title: "Nghe & Gõ",
  description:
    "Game luyện nghe chép chính tả từ vựng & cụm từ IELTS miễn phí theo giọng Anh-Anh (UK) và Anh-Mỹ (US).",
  path: "/listening",
  keywords: [
    "nghe chép chính tả IELTS",
    "IELTS Listening dictation",
    "luyện nghe tiếng Anh UK US",
    "chính tả từ vựng IELTS",
  ],
});

export default function ListeningPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <ListeningGame />
    </Suspense>
  );
}
