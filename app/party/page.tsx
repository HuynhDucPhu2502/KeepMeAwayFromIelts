import type { Viewport } from "next";
import { Suspense } from "react";
import { pageMetadata } from "../seo";
import PartyPlayer from "./PartyPlayer";

export const metadata = pageMetadata({
  title: "Đấu Phòng Party",
  description:
    "Chế độ Battle Royale gõ từ vựng IELTS 2–30 người cùng lúc: tạo phòng hoặc quét QR vào chơi ngay, để rơi 5 từ là bị loại.",
  path: "/party",
  keywords: [
    "đấu phòng từ vựng IELTS",
    "game tiếng Anh nhiều người chơi",
    "party typing game IELTS",
    "thi gõ từ tiếng Anh theo lớp",
  ],
});

export const viewport: Viewport = {
  themeColor: "#faf6ee",
  // Android Chrome: shrink the page when the keyboard opens, so the typing box stays visible.
  interactiveWidget: "resizes-content",
};

// PartyPlayer reads ?room= with useSearchParams, so it renders in the browser below this boundary.
export default function PartyPage() {
  return (
    <Suspense fallback={<div className="game party-phone" />}>
      <PartyPlayer />
    </Suspense>
  );
}
