export type HubGameId = "typing" | "reading" | "writing" | "listening" | "blitz" | "scramble" | "speaking";

export interface HubGameMeta {
  id: HubGameId;
  path: string;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  priority: number;
}

export const HUB_GAMES: HubGameMeta[] = [
  {
    id: "typing",
    path: "/typing",
    icon: "/icons/solo.webp",
    title: "Gõ từ rơi",
    subtitle: "Chơi đơn hoặc Đấu phòng 2–30 người · Boss mỗi 5 map",
    badge: "Vocab · Party",
    priority: 0.95,
  },
  {
    id: "reading",
    path: "/reading",
    icon: "/icons/reading.webp",
    title: "Reading Sniper",
    subtitle: "Bắt bẫy True / False / Not Given · Highlight dẫn chứng",
    badge: "Reading",
    priority: 0.92,
  },
  {
    id: "writing",
    path: "/writing",
    icon: "/icons/trophy.webp",
    title: "Writing Sprint",
    subtitle: "8 biểu đồ Task 1 · 6 dạng luận Task 2",
    badge: "Writing",
    priority: 0.9,
  },
  {
    id: "listening",
    path: "/listening",
    icon: "/icons/listening.webp",
    title: "Nghe & Gõ",
    subtitle: "Nghe phát âm UK/US & luyện chính tả",
    badge: "Listening",
    priority: 0.9,
  },
  {
    id: "blitz",
    path: "/blitz",
    icon: "/icons/blitz.webp",
    title: "Nối Nghĩa Tốc Độ",
    subtitle: "60s phản xạ 4 đáp án · Fever x2 điểm",
    badge: "Speed",
    priority: 0.85,
  },
  {
    id: "scramble",
    path: "/scramble",
    icon: "/icons/scramble.webp",
    title: "Xếp Chữ IELTS",
    subtitle: "Ghép chữ cái bị xáo trộn từ nghĩa Việt",
    badge: "Puzzle",
    priority: 0.85,
  },
  {
    id: "speaking",
    path: "/speaking",
    icon: "/icons/speaking.webp",
    title: "Phản Xạ Speaking",
    subtitle: "Cụm nói Part 1–3 & Cue Card 45 giây",
    badge: "Speaking",
    priority: 0.9,
  },
];

// Lightweight counts for the landing Hub so `/` doesn't bundle the 300KB words.json.
export const VOCAB_COUNTS = {
  words: 5785,
  phrases: 307,
} as const;
