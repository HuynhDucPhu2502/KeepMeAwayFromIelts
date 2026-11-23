import { Suspense } from "react";
import { GameJsonLd, JsonLdScript, jsonLdBreadcrumbList } from "@/app/_components/JsonLd";
import { findHubGameById } from "@/lib/games-registry";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import WritingGame from "./_components/WritingGame";

const game = findHubGameById("writing");
if (!game) throw new Error('Missing "writing" game registry entry');

const breadcrumb = jsonLdBreadcrumbList([
  { name: SITE_NAME, href: "" },
  { name: game.title, href: game.path },
]);

export const metadata = pageMetadata({
  title: "Writing Sprint",
  description:
    "Game luyện IELTS Writing miễn phí: soi 8 dạng biểu đồ Task 1 thật, điền collocation Band 8 và xếp mạch đoạn văn 6 dạng bài luận Task 2.",
  path: "/writing",
  keywords: [
    "IELTS Writing Task 1",
    "IELTS Writing Task 2",
    "luyện viết IELTS",
    "biểu đồ IELTS Task 1",
    "collocation IELTS Band 8",
  ],
});

export default function WritingPage() {
  return (
    <>
      <JsonLdScript data={breadcrumb} />
      <GameJsonLd
        name="Writing Sprint · Task 1 & 2"
        description="Game luyện IELTS Writing miễn phí: soi 8 dạng biểu đồ Task 1, điền collocation Band 8 và xếp mạch đoạn văn Task 2."
        path="/writing"
        skill="IELTS Academic Writing Task 1 & Task 2"
      />
      <Suspense fallback={<div className="game ws-page" />}>
        <WritingGame />
      </Suspense>
    </>
  );
}
