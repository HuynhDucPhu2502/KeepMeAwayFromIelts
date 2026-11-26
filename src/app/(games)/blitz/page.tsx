import { Suspense } from "react";
import { GameJsonLd, JsonLdScript, jsonLdBreadcrumbList } from "@/app/_components/JsonLd";
import { findHubGameById } from "@/lib/games-registry";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import BlitzGame from "./_components/BlitzGame";

const game = findHubGameById("blitz");
if (!game) throw new Error('Missing "blitz" game registry entry');

const breadcrumb = jsonLdBreadcrumbList([
  { name: SITE_NAME, href: "" },
  { name: game.title, href: game.path },
]);

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
    <>
      <JsonLdScript data={breadcrumb} />
      <GameJsonLd
        name="Nối Nghĩa Tốc Độ · Vocab Blitz"
        description="Thử thách phản xạ nối nghĩa từ vựng IELTS 4 đáp án trong 30/60/90 giây kèm Fever Mode nhân đôi điểm."
        path="/blitz"
        skill="IELTS Vocabulary Meaning Recall"
      />
      <Suspense fallback={<div className="game ws-page" />}>
        <BlitzGame />
      </Suspense>
    </>
  );
}
