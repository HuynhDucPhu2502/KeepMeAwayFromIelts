import { Suspense } from "react";
import { GameJsonLd } from "@/components/GameJsonLd";
import { pageMetadata } from "@/lib/seo";
import ScrambleGame from "./_components/ScrambleGame";

export const metadata = pageMetadata({
  title: "Xếp Chữ IELTS",
  description:
    "Game ghép chữ cái bị xáo trộn từ nghĩa tiếng Việt để rèn trí nhớ mặt chữ và chính tả từ vựng IELTS.",
  path: "/scramble",
  keywords: [
    "xếp chữ tiếng Anh",
    "word scramble IELTS",
    "luyện chính tả tiếng Anh",
    "ghép từ vựng IELTS",
  ],
});

export default function ScramblePage() {
  return (
    <>
      <GameJsonLd
        name="Xếp Chữ IELTS · Word Scramble"
        description="Game ghép chữ cái bị xáo trộn từ nghĩa tiếng Việt để rèn trí nhớ mặt chữ và chính tả từ vựng IELTS."
        path="/scramble"
        skill="IELTS Vocabulary Spelling & Word Recognition"
      />
      <Suspense fallback={<div className="game ws-page" />}>
        <ScrambleGame />
      </Suspense>
    </>
  );
}
