import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import PartyPlayer from "./PartyPlayer";

export const metadata: Metadata = {
  title: "Party · Keep Me Away From IELTS",
  description: "Cả booth cùng gõ chữ: để rơi 5 từ là bị loại, người trụ lại cuối cùng thắng.",
};

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
