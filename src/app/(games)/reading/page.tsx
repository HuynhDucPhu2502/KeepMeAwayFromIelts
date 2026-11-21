import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo";
import ReadingGame from "./_components/ReadingGame";

export const metadata = pageMetadata({
  title: "Reading Sniper · True / False / Not Given",
  description:
    "Game luyện IELTS Reading True / False / Not Given miễn phí: 24 đoạn học thuật bẫy kinh điển, highlight dẫn chứng ngay trong bài và chấm Band ước tính.",
  path: "/reading",
  keywords: [
    "IELTS Reading True False Not Given",
    "luyện đọc IELTS Reading",
    "phân biệt False và Not Given",
    "game học IELTS Reading",
  ],
});

export default function ReadingPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <ReadingGame />
    </Suspense>
  );
}
