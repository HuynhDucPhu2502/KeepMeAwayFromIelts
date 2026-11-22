import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { HUB_GAMES } from "@/lib/games-registry";
import { DEFAULT_KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  variable: "--font-ui",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = Geist_Mono({
  variable: "--font-mono-ui",
  subsets: ["latin"],
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Kho 8 Mini-Game Học IELTS Miễn Phí (Đủ 4 Kỹ Năng)`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  formatDetection: { telephone: false, address: false, email: false },
  alternates: {
    canonical: "/",
    languages: {
      "vi-VN": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/logo.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Kho 8 Mini-Game Học IELTS Miễn Phí`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-banner.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Kho 8 mini-game học IELTS miễn phí đủ 4 kỹ năng`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Kho 8 Mini-Game Học IELTS Miễn Phí`,
    description: SITE_DESCRIPTION,
    images: ["/og-banner.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#faf6ee",
};

const JSON_LD_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ["KMAFI", "Game học IELTS miễn phí"],
      url: SITE_URL,
      inLanguage: ["vi", "en"],
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript. Modern HTML5 browser.",
      inLanguage: ["vi", "en"],
      isAccessibleForFree: true,
      image: `${SITE_URL}/og-banner.png`,
      screenshot: `${SITE_URL}/og-banner.png`,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "VND",
      },
      featureList: [
        "Gõ từ rơi IELTS (5.785 từ & 307 cụm từ)",
        "Đấu phòng Party Battle Royale 2–30 người",
        "Reading Sniper: 24 bài True / False / Not Given kèm highlight dẫn chứng",
        "Writing Sprint: 8 dạng biểu đồ Task 1 & 6 dạng luận Task 2",
        "Paraphrase Lab: tự gõ nâng cấp câu Band 5 → Band 8, bắt lỗi ngữ pháp & dựng câu phức",
        "Nghe & Gõ chính tả giọng UK/US",
        "Nối Nghĩa Tốc Độ 60s Fever Mode",
        "Xếp Chữ IELTS & Phản Xạ Speaking Part 1–3 có Micro tự chấm từ khóa",
        "Tự tạo bộ từ vựng riêng & chia sẻ bằng đường link",
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${SITE_URL}/#games`,
      name: "Danh sách mini-game học IELTS tại Keep Me Away From IELTS",
      numberOfItems: HUB_GAMES.length + 2,
      itemListElement: [
        ...HUB_GAMES.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: g.title,
          url: `${SITE_URL}${g.path}`,
        })),
        {
          "@type": "ListItem",
          position: HUB_GAMES.length + 1,
          name: "Bộ Từ Riêng & Chia Sẻ Link",
          url: `${SITE_URL}/deck`,
        },
        {
          "@type": "ListItem",
          position: HUB_GAMES.length + 2,
          name: "Đấu Phòng Party 2–30 Người",
          url: `${SITE_URL}/party`,
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_GRAPH) }}
        />
        {children}
      </body>
    </html>
  );
}
