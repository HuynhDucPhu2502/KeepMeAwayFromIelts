import type { Metadata } from "next";
import { Suspense } from "react";
import BlitzGame from "./BlitzGame";

export const metadata: Metadata = {
  title: "Nối Nghĩa Tốc Độ · Keep Me Away From IELTS",
  description: "Thử thách nối nghĩa từ vựng IELTS siêu tốc trong 60 giây kèm Fever Mode x2 điểm.",
};

export default function BlitzPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <BlitzGame />
    </Suspense>
  );
}
