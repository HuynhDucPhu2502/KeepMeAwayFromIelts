import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
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
  title: "Keep Me Away From IELTS",
  description: "Mini game gõ chữ: gõ các từ và cụm từ IELTS trước khi chúng rơi chạm đất.",
};

export const viewport: Viewport = {
  themeColor: "#faf6ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
