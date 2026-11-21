import type { Metadata } from "next";
import { Suspense } from "react";
import ListeningGame from "./ListeningGame";

export const metadata: Metadata = {
  title: "Nghe & Gõ · Keep Me Away From IELTS",
  description: "Luyện nghe và chính tả từ vựng IELTS theo giọng Anh-Anh / Anh-Mỹ.",
};

export default function ListeningPage() {
  return (
    <Suspense fallback={<div className="game ws-page" />}>
      <ListeningGame />
    </Suspense>
  );
}
