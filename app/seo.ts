import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://keepmeawayfromielts.vnftgroup.com").replace(/\/+$/, "");
export const SITE_NAME = "Keep Me Away From IELTS";
export const SITE_DESCRIPTION =
  "Kho 6 mini-game học IELTS miễn phí: Gõ từ rơi (Chơi đơn & Đấu phòng 30 người), Writing Sprint (8 biểu đồ Task 1 & 6 dạng luận Task 2), Nghe & Gõ UK/US, Nối Nghĩa Tốc Độ, Xếp Chữ IELTS và Phản Xạ Speaking.";

export const DEFAULT_KEYWORDS = [
  "Keep Me Away From IELTS",
  "game học IELTS",
  "học từ vựng IELTS",
  "luyện gõ tiếng Anh IELTS",
  "IELTS Writing Task 1 Task 2",
  "IELTS Listening chính tả",
  "IELTS Speaking Part 1 2 3",
  "trò chơi từ vựng tiếng Anh",
  "IELTS vocabulary game",
];

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${opts.path}`;
  return {
    title: opts.title,
    description: opts.description,
    keywords: opts.keywords ? [...opts.keywords, ...DEFAULT_KEYWORDS.slice(0, 4)] : DEFAULT_KEYWORDS,
    alternates: { canonical: opts.path },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url,
      siteName: SITE_NAME,
      title: `${opts.title} · ${SITE_NAME}`,
      description: opts.description,
      images: [
        {
          url: "/og-banner.png",
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — Kho 6 mini-game học IELTS miễn phí`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${opts.title} · ${SITE_NAME}`,
      description: opts.description,
      images: ["/og-banner.png"],
    },
    ...(opts.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
