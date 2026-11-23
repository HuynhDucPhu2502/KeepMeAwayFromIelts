import { Suspense } from "react";
import { GameJsonLd } from "@/app/_components/JsonLd";
import { pageMetadata } from "@/lib/seo";
import WritingLabGame from "./_components/WritingLabGame";

export const metadata = pageMetadata({
  title: "Paraphrase Lab · Luyện Viết Câu Band 8",
  description:
    "Game luyện viết IELTS Writing miễn phí: nâng cấp câu Band 5.5 lên Band 8, bắt lỗi ngữ pháp học thuật và dựng câu phức Overview / Thesis.",
  path: "/writing-lab",
  keywords: [
    "luyện paraphrase IELTS Writing",
    "nâng cấp câu IELTS Band 8",
    "sửa lỗi ngữ pháp IELTS Writing",
    "viết câu phức IELTS Task 1 Task 2",
  ],
});

export default function WritingLabPage() {
  return (
    <>
      <GameJsonLd
        name="Paraphrase Lab · Luyện Viết Câu Band 8"
        description="Game luyện viết IELTS Writing miễn phí: tự gõ paraphrase nâng cấp câu, bắt lỗi ngữ pháp kinh điển và dựng câu phức Band 8."
        path="/writing-lab"
        skill="IELTS Writing Paraphrasing, Grammar Accuracy & Complex Sentences"
      />
      <Suspense fallback={<div className="game ws-page" />}>
        <WritingLabGame />
      </Suspense>
    </>
  );
}
