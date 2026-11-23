import { Suspense } from "react";
import { GameJsonLd, JsonLdScript, jsonLdBreadcrumbList } from "@/app/_components/JsonLd";
import { findHubGameById } from "@/lib/games-registry";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import TypingGame from "./_components/TypingGame";

const game = findHubGameById("typing");
if (!game) throw new Error('Missing "typing" game registry entry');

const breadcrumb = jsonLdBreadcrumbList([
  { name: SITE_NAME, href: "" },
  { name: game.title, href: game.path },
]);

export const metadata = pageMetadata({
  title: "Gõ Từ Rơi IELTS",
  description:
    "Game gõ từ vựng & cụm từ IELTS rơi miễn phí: 5.785 từ học thuật, 307 cụm Reading/Listening, Boss mỗi 5 map và hồi máu ♥.",
  path: "/typing",
  keywords: [
    "gõ từ rơi IELTS",
    "typing game IELTS",
    "luyện gõ tiếng Anh",
    "học từ vựng IELTS nhanh",
  ],
});

export default function TypingPage() {
  return (
    <>
      <JsonLdScript data={breadcrumb} />
      <GameJsonLd
        name="Gõ Từ Rơi IELTS"
        description="Game gõ từ vựng & cụm từ IELTS rơi miễn phí: 5.785 từ học thuật, 307 cụm Reading/Listening, Boss mỗi 5 map và hồi máu."
        path="/typing"
        skill="IELTS Academic Vocabulary & Typing Speed"
      />
      <Suspense fallback={<div className="game" />}>
        <TypingGame />
      </Suspense>
    </>
  );
}
