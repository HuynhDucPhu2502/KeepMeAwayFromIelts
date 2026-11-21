// Curated IELTS Speaking Part 1, 2 & 3 challenges (Cloze fluency sprint + 45s Cue Card challenge).

export interface SpeakingCloze {
  id: string;
  part: "Part 1" | "Part 2" | "Part 3";
  topic: string;
  question: string;
  sentence: string; // contains `___`
  choices: string[];
  answer: number;
  takeaway: string;
  note: string;
}

export interface SpeakingCueCard {
  id: string;
  topic: string;
  title: string;
  bullets: string[];
  template: string;
  keywords: { word: string; vi: string }[];
  sample: string;
}

export const SPEAKING_CLOZE: SpeakingCloze[] = [
  {
    id: "sp_1",
    part: "Part 1",
    topic: "Work & Study",
    question: "How do you usually manage a busy week at work or university?",
    sentence: "I break big projects into smaller tasks so I can ___ without feeling overwhelmed.",
    choices: ["meet a deadline", "miss the point", "turn a blind eye"],
    answer: 0,
    takeaway: "meet a deadline",
    note: "“meet a deadline” (hoàn thành đúng hạn) là collocation tự nhiên cực ăn điểm Speaking Part 1 & 3.",
  },
  {
    id: "sp_2",
    part: "Part 1",
    topic: "Hobbies",
    question: "What do you usually do after a demanding day?",
    sentence: "I love watching a light-hearted comedy to ___ and clear my head.",
    choices: ["unwind", "overtake", "comply"],
    answer: 0,
    takeaway: "unwind",
    note: "“unwind” (thư giãn xả hơi) nghe tự nhiên và bản xứ hơn hẳn lặp đi lặp lại từ “relax”.",
  },
  {
    id: "sp_3",
    part: "Part 1",
    topic: "Hobbies",
    question: "Have you started any new hobbies recently?",
    sentence: "Yes, I decided to ___ photography last winter, and it has been surprisingly rewarding.",
    choices: ["take up", "give away", "put off"],
    answer: 0,
    takeaway: "take up a hobby",
    note: "Bắt đầu một sở thích mới trong Speaking dùng cụm động từ “take up”.",
  },
  {
    id: "sp_4",
    part: "Part 1",
    topic: "Home & Neighbourhood",
    question: "What do you like most about the area where you live?",
    sentence: "What ___ most is the cosy atmosphere and how accessible the local cafés are.",
    choices: ["stands out", "breaks down", "runs out"],
    answer: 0,
    takeaway: "What stands out most is...",
    note: "Khung mở ý “What stands out most is…” giúp câu trả lời Part 1 tự nhiên, có trọng tâm ngay từ câu đầu.",
  },
  {
    id: "sp_5",
    part: "Part 1",
    topic: "Technology",
    question: "How important is your smartphone in daily life?",
    sentence: "Honestly, I ___ it for almost everything, from navigating the city to paying bills.",
    choices: ["rely on", "account for", "settle down"],
    answer: 0,
    takeaway: "rely on",
    note: "“rely on” (phụ thuộc / dựa vào) + liệt kê “from A to B” là công thức ăn điểm Fluency.",
  },
  {
    id: "sp_6",
    part: "Part 2",
    topic: "People & Experience",
    question: "Looking back on a difficult challenge you overcame...",
    sentence: "___, it mattered to me because it taught me how to stay calm under pressure.",
    choices: ["Looking back", "By contrast", "Respectively"],
    answer: 0,
    takeaway: "Looking back, ...",
    note: "Dùng “Looking back…” ở phần kết Part 2 giúp chuyển giọng kể chuyện sang chiêm nghiệm rất mượt.",
  },
  {
    id: "sp_7",
    part: "Part 2",
    topic: "Habits & Skills",
    question: "Why did you keep practising that skill?",
    sentence: "Even when progress felt slow, I decided to ___ it because I could see long-term value.",
    choices: ["stick with", "drop out of", "catch up on"],
    answer: 0,
    takeaway: "stick with",
    note: "“stick with something” (kiên trì theo đuổi) tự nhiên hơn nhiều so với “continue to do”.",
  },
  {
    id: "sp_8",
    part: "Part 3",
    topic: "Cities & Housing",
    question: "Why do some people prefer living in quieter towns later in life?",
    sentence: "Many adults move away from the city centre once they want to ___ and raise a family.",
    choices: ["settle down", "take off", "show up"],
    answer: 0,
    takeaway: "settle down",
    note: "“settle down” (ổn định cuộc sống, lập gia đình) là cụm cực hay cho chủ đề Home / Cities.",
  },
  {
    id: "sp_9",
    part: "Part 3",
    topic: "Generations",
    question: "Do younger and older people view technology differently?",
    sentence: "There is a difference, but it's not absolute — it's better to avoid a simple ___.",
    choices: ["stereotype", "deadline", "curriculum"],
    answer: 0,
    takeaway: "avoid a simple stereotype",
    note: "Khi thảo luận Part 3, câu “avoid a simple stereotype” thể hiện tư duy sắc bén Band 8+.",
  },
  {
    id: "sp_10",
    part: "Part 3",
    topic: "Future Trends",
    question: "How might education change over the next ten years?",
    sentence: "The shift is ___ to be gradual rather than immediate, as schools need time to adapt.",
    choices: ["likely", "mandatory", "impossible"],
    answer: 0,
    takeaway: "likely to be gradual rather than immediate",
    note: "Trong Speaking Part 3, tránh nói tuyệt đối (always/never) — dùng hedging “likely to be…” ghi điểm rất cao.",
  },
  {
    id: "sp_11",
    part: "Part 3",
    topic: "Work-Life Balance",
    question: "Why do hobbies matter to working adults?",
    sentence: "Having a creative outlet helps people maintain a healthier ___ and avoid burnout.",
    choices: ["work-life balance", "widening gap", "percentage point"],
    answer: 0,
    takeaway: "maintain a healthier work-life balance",
    note: "Cụm “creative outlet + maintain a healthier work-life balance” cực ghi điểm Lexical Resource.",
  },
  {
    id: "sp_12",
    part: "Part 3",
    topic: "Society & Equality",
    question: "Does everyone benefit equally from new digital tools?",
    sentence: "___, not everyone benefits in the same way, since access to training can be unequal.",
    choices: ["Admittedly", "Initially", "Subsequently"],
    answer: 0,
    takeaway: "Admittedly, ...",
    note: "Dùng “Admittedly, …” để thừa nhận mặt trái trước khi chốt quan điểm giúp Part 3 cực kỳ mạch lạc.",
  },
];

export const SPEAKING_CUE_CARDS: SpeakingCueCard[] = [
  {
    id: "cue_work",
    topic: "Work & Study",
    title: "Describe a difficult task you completed with help from someone",
    bullets: [
      "What the task was and when it happened",
      "Who helped you with it",
      "How you worked together",
      "And explain what you learned from the experience",
    ],
    template: "I'd like to talk about ___. At first, ___. With help from ___, I managed to ___. Looking back, it mattered because ___.",
    keywords: [
      { word: "productive", vi: "hiệu quả" },
      { word: "workload", vi: "khối lượng việc" },
      { word: "practical skill", vi: "kỹ năng thực tế" },
      { word: "meet a deadline", vi: "kịp hạn chót" },
    ],
    sample:
      "I'd like to talk about finishing a demanding group presentation last semester. Our workload felt overwhelming at first, but a senior teammate helped me break the slides into clear milestones. We stayed productive and managed to meet a tight deadline. Looking back, it gave me a practical skill I still rely on every week.",
  },
  {
    id: "cue_place",
    topic: "Places & Cities",
    title: "Describe a public place in your city with a great atmosphere",
    bullets: [
      "Where this place is located",
      "What it looks like",
      "What people usually do there",
      "And explain why its atmosphere stands out to you",
    ],
    template: "A place that immediately comes to mind is ___. It's fairly accessible and ___. What stands out most is ___.",
    keywords: [
      { word: "atmosphere", vi: "bầu không khí" },
      { word: "spacious", vi: "rộng rãi" },
      { word: "accessible", vi: "dễ tiếp cận" },
      { word: "stand out", vi: "nổi bật" },
    ],
    sample:
      "A place that immediately comes to mind is the riverside park near my neighbourhood. It is spacious, tree-lined and easily accessible by bus or bike. People jog, read or chat with friends at sunset. What stands out most is its calm atmosphere right in the middle of a busy city.",
  },
  {
    id: "cue_tech",
    topic: "Technology",
    title: "Describe a digital tool or app you use almost every day",
    bullets: [
      "What the app/tool is",
      "When you started using it",
      "What features you use most",
      "And explain why you rely on it",
    ],
    template: "I'd like to talk about ___, which I rely on almost daily. Its most useful feature is ___. Overall, it makes my routine much more efficient because ___.",
    keywords: [
      { word: "user-friendly", vi: "dễ sử dụng" },
      { word: "efficient", vi: "hiệu quả" },
      { word: "feature", vi: "tính năng" },
      { word: "rely on", vi: "dựa vào" },
    ],
    sample:
      "I'd like to talk about a note-taking app I rely on every single day. I started using it during exam season because the interface is super user-friendly. My favourite feature is quick voice search, which keeps my study sessions far more efficient than flipping through paper notebooks.",
  },
  {
    id: "cue_hobby",
    topic: "Hobbies & Free Time",
    title: "Describe an activity you enjoy doing to relax after a busy day",
    bullets: [
      "What the activity is",
      "When and where you do it",
      "How you first took it up",
      "And explain why it helps you unwind",
    ],
    template: "Whenever I've had a demanding day, I like to ___. I first took it up when ___. I stick with it because ___.",
    keywords: [
      { word: "unwind", vi: "thư giãn" },
      { word: "rewarding", vi: "bổ ích / đáng giá" },
      { word: "take up", vi: "bắt đầu theo đuổi" },
      { word: "stick with", vi: "kiên trì gắn bó" },
    ],
    sample:
      "Whenever I've had a demanding day, I like to go for a slow evening jog while listening to podcasts. I first took it up two years ago to improve my sleep. Even on tiring days I stick with it, because twenty minutes outside helps me unwind completely and feels genuinely rewarding.",
  },
];
