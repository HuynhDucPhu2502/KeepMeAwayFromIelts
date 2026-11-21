import { Suspense } from "react";
import { pageMetadata } from "../seo";
import BlitzGame from "./BlitzGame";

export const metadata = pageMetadata({
  title: "Nối Nghĩa Tốc Độ",
  description:
    "Thử thách phản xạ nối nghĩa từ vựng IELTS 4 đáp án trong 30/60/90 giây kèm Fever Mode nhân đôi điểm.",
  path: "/blitz",
  keywords: [
    "trắc nghiệm từ vựng IELTS",
    "nối nghĩa tiếng Anh tốc độ",
    "game học từ vựng nhanh",
    "IELTS vocabulary quiz",
  ],
});

export default function BlitzPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <BlitzGame />
    </Suspense>
  );
}
