import type { Metadata } from "next";
import { Suspense } from "react";
import SpeakingGame from "./SpeakingGame";

export const metadata: Metadata = {
  title: "Phản Xạ Speaking · Keep Me Away From IELTS",
  description: "Luyện cụm từ nói tự nhiên Part 1–3 và thử thách Cue Card 45 giây chuẩn IELTS Speaking.",
};

export default function SpeakingPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <SpeakingGame />
    </Suspense>
  );
}
