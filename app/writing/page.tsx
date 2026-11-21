import type { Metadata } from "next";
import { Suspense } from "react";
import WritingGame from "./WritingGame";

export const metadata: Metadata = {
  title: "Writing Sprint · Keep Me Away From IELTS",
  description: "Game luyện IELTS Writing: soi 8 dạng biểu đồ Task 1, điền collocation Band 8 và xếp mạch đoạn văn Task 2.",
};

export default function WritingPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <WritingGame />
    </Suspense>
  );
}
