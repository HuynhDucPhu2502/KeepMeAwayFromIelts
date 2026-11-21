import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Kho 6 Mini-Game Học IELTS Miễn Phí`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  category: "education",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logo.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Kho 6 Mini-Game Học IELTS Miễn Phí`,
    description: SITE_DESCRIPTION,
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
    title: `${SITE_NAME} — Kho 6 Mini-Game Học IELTS Miễn Phí`,
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
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#faf6ee",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  inLanguage: ["vi", "en"],
  isAccessibleForFree: true,
  image: `${SITE_URL}/og-banner.png`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "VND",
  },
  featureList: [
    "Gõ từ rơi IELTS (5.785 từ & 307 cụm từ)",
    "Đấu phòng Party Battle Royale 2–30 người",
    "Writing Sprint: 8 dạng biểu đồ Task 1 & 6 dạng luận Task 2",
    "Nghe & Gõ chính tả giọng UK/US",
    "Nối Nghĩa Tốc Độ 60s Fever Mode",
    "Xếp Chữ IELTS & Phản Xạ Speaking Part 1–3",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
