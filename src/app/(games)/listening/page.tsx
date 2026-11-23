import { Suspense } from "react";
import { GameJsonLd, JsonLdScript, jsonLdBreadcrumbList } from "@/app/_components/JsonLd";
import { findHubGameById } from "@/lib/games-registry";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import ListeningGame from "./_components/ListeningGame";

const game = findHubGameById("listening");
if (!game) throw new Error('Missing "listening" game registry entry');

const breadcrumb = jsonLdBreadcrumbList([
  { name: SITE_NAME, href: "" },
  { name: game.title, href: game.path },
]);

export const metadata = pageMetadata({
  title: "Nghe & Gõ",
  description:
    "Game luyện nghe chép chính tả từ vựng & cụm từ IELTS miễn phí theo giọng Anh-Anh (UK) và Anh-Mỹ (US).",
  path: "/listening",
  keywords: [
    "nghe chép chính tả IELTS",
    "IELTS Listening dictation",
    "luyện nghe tiếng Anh UK US",
    "chính tả từ vựng IELTS",
  ],
});

export default function ListeningPage() {
  return (
    <>
      <JsonLdScript data={breadcrumb} />
      <GameJsonLd
        name="Nghe & Gõ · IELTS Listening"
        description="Game luyện nghe chép chính tả từ vựng & cụm từ IELTS miễn phí theo giọng Anh-Anh (UK) và Anh-Mỹ (US)."
        path="/listening"
        skill="IELTS Listening Dictation & Spelling"
      />
      <Suspense fallback={<div className="game ws-page" />}>
        <ListeningGame />
      </Suspense>
    </>
  );
}
