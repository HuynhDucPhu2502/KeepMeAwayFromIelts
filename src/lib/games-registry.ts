export type HubGameId =
  | "typing"
  | "reading"
  | "writing"
  | "writing-lab"
  | "listening"
  | "blitz"
  | "scramble"
  | "speaking";

export type SkillCategory = "all" | "vocab" | "reading" | "writing" | "listening" | "speaking" | "tools";

export interface HubGameMeta {
  id: HubGameId;
  path: string;
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  skill: Exclude<SkillCategory, "all">;
  highlights: string[];
  priority: number;
  isNew?: boolean;
}

export const HUB_GAMES: HubGameMeta[] = [
  {
    id: "typing",
    path: "/typing",
    icon: "/icons/solo.webp",
    title: "Gõ Từ Rơi",
    subtitle: "Gõ từ vựng & cụm từ IELTS trước khi chạm đất, đấu Boss mỗi 5 map và ăn tim hồi mạng.",
    badge: "Từ vựng",
    skill: "vocab",
    highlights: ["5.785 từ & 307 cụm", "Boss mỗi 5 map"],
    priority: 0.95,
  },
  {
    id: "reading",
    path: "/reading",
    icon: "/icons/reading.webp",
    title: "Reading Sniper",
    subtitle: "Bắt bẫy True / False / Not Given với 24 đoạn văn học thuật và highlight câu dẫn chứng.",
    badge: "Reading",
    skill: "reading",
    highlights: ["24 đoạn học thuật", "Highlight dẫn chứng"],
    priority: 0.92,
  },
  {
    id: "writing",
    path: "/writing",
    icon: "/icons/trophy.webp",
    title: "Writing Sprint",
    subtitle: "Soi 8 dạng biểu đồ Task 1 thật, điền collocation Band 8 và xếp mạch 4 đoạn Task 2.",
    badge: "Writing",
    skill: "writing",
    highlights: ["8 biểu đồ Task 1", "6 dạng luận Task 2"],
    priority: 0.92,
  },
  {
    id: "writing-lab",
    path: "/writing-lab",
    icon: "/icons/writing-lab.webp",
    title: "Paraphrase Lab",
    subtitle: "Tự gõ nâng cấp câu Band 5 → Band 8, chạm bắt lỗi ngữ pháp & ghép câu phức Overview/Thesis.",
    badge: "Writing",
    skill: "writing",
    highlights: ["Gõ Paraphrase Band 8", "Bắt lỗi & Dựng câu"],
    priority: 0.92,
    isNew: true,
  },
  {
    id: "listening",
    path: "/listening",
    icon: "/icons/listening.webp",
    title: "Nghe & Gõ",
    subtitle: "Nghe phát âm giọng Anh-Anh (UK) hoặc Anh-Mỹ (US) rồi chép chính tả, soi sai từng ký tự.",
    badge: "Listening",
    skill: "listening",
    highlights: ["Giọng UK / US", "Soi lỗi từng chữ"],
    priority: 0.9,
  },
  {
    id: "blitz",
    path: "/blitz",
    icon: "/icons/blitz.webp",
    title: "Nối Nghĩa Tốc Độ",
    subtitle: "Đua phản xạ 4 đáp án bằng phím 1–4 trong 30/60/90 giây, chuỗi 5 kích hoạt Fever x2 điểm.",
    badge: "Từ vựng",
    skill: "vocab",
    highlights: ["Anh → Việt / Việt → Anh", "Fever x2 & +2s"],
    priority: 0.85,
  },
  {
    id: "scramble",
    path: "/scramble",
    icon: "/icons/scramble.webp",
    title: "Xếp Chữ IELTS",
    subtitle: "Nhìn nghĩa tiếng Việt rồi ghép các chữ cái xáo trộn thành từ học thuật chuẩn chính tả.",
    badge: "Từ vựng",
    skill: "vocab",
    highlights: ["Bấm thẻ hoặc gõ phím", "Gợi ý từng chữ"],
    priority: 0.85,
  },
  {
    id: "speaking",
    path: "/speaking",
    icon: "/icons/speaking.webp",
    title: "Phản Xạ Speaking",
    subtitle: "Luyện cụm nói tự nhiên Part 1–3 và thử thách Cue Card Part 2 45 giây có Micro tự chấm.",
    badge: "Speaking",
    skill: "speaking",
    highlights: ["Part 1–3 Collocation", "Micro chấm từ khóa"],
    priority: 0.9,
  },
];

// Lightweight counts for the landing Hub so `/` doesn't bundle the 300KB words.json.
export const VOCAB_COUNTS = {
  words: 5785,
  phrases: 307,
} as const;
