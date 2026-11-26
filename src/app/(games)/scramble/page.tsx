import { Suspense } from "react";
import { GameJsonLd, JsonLdScript, jsonLdBreadcrumbList } from "@/app/_components/JsonLd";
import { findHubGameById } from "@/lib/games-registry";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import ScrambleGame from "./_components/ScrambleGame";

const game = findHubGameById("scramble");
if (!game) throw new Error('Missing "scramble" game registry entry');

const breadcrumb = jsonLdBreadcrumbList([
  { name: SITE_NAME, href: "" },
  { name: game.title, href: game.path },
]);

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
      <JsonLdScript data={breadcrumb} />
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
