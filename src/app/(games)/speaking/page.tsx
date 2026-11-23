import { Suspense } from "react";
import { GameJsonLd, JsonLdScript, jsonLdBreadcrumbList } from "@/app/_components/JsonLd";
import { findHubGameById } from "@/lib/games-registry";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import SpeakingGame from "./_components/SpeakingGame";

const game = findHubGameById("speaking");
if (!game) throw new Error('Missing "speaking" game registry entry');

const breadcrumb = jsonLdBreadcrumbList([
  { name: SITE_NAME, href: "" },
  { name: game.title, href: game.path },
]);

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
    <>
      <JsonLdScript data={breadcrumb} />
      <GameJsonLd
        name="Phản Xạ Speaking · Part 1–3 & Cue Card Micro"
        description="Luyện cụm từ nói tự nhiên IELTS Speaking Part 1–3 và thử thách Cue Card 45 giây có Micro tự động chấm từ khóa Band 8."
        path="/speaking"
        skill="IELTS Speaking Part 1, Part 2 & Part 3 Fluency"
      />
      <Suspense fallback={<div className="game ws-page" />}>
        <SpeakingGame />
      </Suspense>
    </>
  );
}
