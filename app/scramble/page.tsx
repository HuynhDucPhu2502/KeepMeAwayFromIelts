import type { Metadata } from "next";
import { Suspense } from "react";
import ScrambleGame from "./ScrambleGame";

export const metadata: Metadata = {
  title: "Xếp Chữ IELTS · Keep Me Away From IELTS",
  description: "Ghép lại các chữ cái bị xáo trộn từ nghĩa tiếng Việt để luyện chính tả từ vựng IELTS.",
};

export default function ScramblePage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <ScrambleGame />
    </Suspense>
  );
}
