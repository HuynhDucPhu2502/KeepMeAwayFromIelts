// Curated IELTS Writing Lab dataset:
// 1. upgrade: Type the Band 8 academic phrase to upgrade a Band 5.5 sentence (accepts multiple valid synonyms).
// 2. error: Spot the flawed grammar/tone segment inside an IELTS sentence, then pick the Band 8 fix.
// 3. build: Assemble shuffled academic clause tiles into a Band 8 Task 1 Overview or Task 2 complex sentence.

export type LabTask = "task1" | "task2";

export interface UpgradeChallenge {
  id: string;
  kind: "upgrade";
  task: LabTask;
  tag: string;
  basicSentence: string;
  /** Sentence with `___` marking the upgraded phrase to type. */
  targetSentence: string;
  /** Canonical answer shown in feedback. */
  canonical: string;
  /** All accepted variations (case-insensitive, whitespace-normalized). */
  accepted: string[];
  meaningVi: string;
  takeaway: string;
  note: string;
}

export interface ErrorChallenge {
  id: string;
  kind: "error";
  task: LabTask;
  tag: string;
  /** Sentence split into 4–5 clickable segments; exactly one index is the error. */
  segments: string[];
  errorIndex: number;
  /** 3 replacement options for the flawed segment. */
  fixes: string[];
  correctFix: number;
  takeaway: string;
  note: string;
}

export interface BuildChallenge {
  id: string;
  kind: "build";
  task: LabTask;
  tag: string;
  promptVi: string;
  /** Ordered clause/phrase tiles forming the complete Band 8 sentence. */
  tiles: string[];
  takeaway: string;
  note: string;
}

export type LabChallenge = UpgradeChallenge | ErrorChallenge | BuildChallenge;

export const LAB_CHALLENGES: LabChallenge[] = [
  // -------------------- 1. UPGRADE (Band 5.5 -> Band 8) --------------------
  {
    id: "upg_1",
    kind: "upgrade",
    task: "task2",
    tag: "Task 2 · Paraphrase",
    basicSentence: "Cars make the air in big cities very dirty.",
    targetSentence: "Private vehicles contribute significantly to ___ in major metropolitan areas.",
    canonical: "air pollution",
    accepted: ["air pollution", "atmospheric pollution", "environmental pollution", "urban air pollution"],
    meaningVi: "ô nhiễm không khí (2 từ)",
    takeaway: "make the air dirty → contribute to air pollution",
    note: "Dùng danh từ học thuật (nominalisation) 'air pollution' kết hợp động từ 'contribute significantly to' thay vì 'make ... very dirty'.",
  },
  {
    id: "upg_2",
    kind: "upgrade",
    task: "task1",
    tag: "Task 1 · Trend Verb",
    basicSentence: "Online shopping went up very fast between 2018 and 2023.",
    targetSentence: "E-commerce sales ___ between 2018 and 2023.",
    canonical: "rose sharply",
    accepted: [
      "rose sharply",
      "increased sharply",
      "grew sharply",
      "surged",
      "soared",
      "rose rapidly",
      "increased rapidly",
      "rose dramatically",
      "increased dramatically",
    ],
    meaningVi: "tăng mạnh / tăng vọt (quá khứ)",
    takeaway: "went up very fast → rose sharply / surged",
    note: "Trong Task 1, tránh cụm nói miệng 'went up very fast'; dùng 'rose sharply', 'increased rapidly' hoặc động từ mạnh 'surged / soared'.",
  },
  {
    id: "upg_3",
    kind: "upgrade",
    task: "task2",
    tag: "Task 2 · Cause & Effect",
    basicSentence: "Sitting too long can cause many bad health problems.",
    targetSentence: "A sedentary lifestyle can ___ a wide range of chronic health conditions.",
    canonical: "lead to",
    accepted: ["lead to", "result in", "give rise to", "trigger", "bring about", "contribute to"],
    meaningVi: "dẫn đến / gây ra (2–3 từ)",
    takeaway: "cause → lead to / result in / give rise to",
    note: "Kết hợp 'a sedentary lifestyle' (lối sống ít vận động) với 'lead to / result in / give rise to' giúp nâng Lexical Resource rõ rệt.",
  },
  {
    id: "upg_4",
    kind: "upgrade",
    task: "task1",
    tag: "Task 1 · Comparison",
    basicSentence: "City A spent much more money on rail than City B.",
    targetSentence: "Expenditure on rail in City A was ___ that of City B.",
    canonical: "significantly higher than",
    accepted: [
      "significantly higher than",
      "considerably higher than",
      "much higher than",
      "far higher than",
      "substantially higher than",
    ],
    meaningVi: "cao hơn đáng kể so với (3 từ)",
    takeaway: "much more → significantly / considerably higher than",
    note: "Khi chủ ngữ là 'Expenditure' (chi tiêu), cần tính từ so sánh 'significantly higher than that of...' thay vì 'more money'.",
  },
  {
    id: "upg_5",
    kind: "upgrade",
    task: "task2",
    tag: "Task 2 · Solution",
    basicSentence: "The government should do something right now to stop climate change.",
    targetSentence: "Policymakers must ___ to mitigate the impacts of climate change.",
    canonical: "take immediate action",
    accepted: [
      "take immediate action",
      "take urgent action",
      "take decisive action",
      "take prompt action",
      "implement urgent measures",
      "take immediate measures",
    ],
    meaningVi: "hành động ngay lập tức (3 từ)",
    takeaway: "do something right now → take immediate action",
    note: "'take immediate/urgent action' + 'mitigate the impacts of' là collocation kinh điển cho đoạn giải pháp Task 2.",
  },
  {
    id: "upg_6",
    kind: "upgrade",
    task: "task2",
    tag: "Task 2 · Balance",
    basicSentence: "Working from home has both good points and bad points.",
    targetSentence: "Remote work offers distinct advantages, yet it also presents several ___.",
    canonical: "drawbacks",
    accepted: ["drawbacks", "disadvantages", "challenges", "limitations", "downsides", "shortcomings"],
    meaningVi: "nhược điểm / mặt hạn chế (1 từ số nhiều)",
    takeaway: "bad points → drawbacks / limitations / downsides",
    note: "Tránh 'good points / bad points' trong văn viết học thuật; dùng 'advantages / benefits' đối lập với 'drawbacks / limitations'.",
  },
  {
    id: "upg_7",
    kind: "upgrade",
    task: "task1",
    tag: "Task 1 · Proportion",
    basicSentence: "Coal was 40% of total power generation in 2010.",
    targetSentence: "Coal ___ 40% of total electricity generation in 2010.",
    canonical: "accounted for",
    accepted: ["accounted for", "made up", "represented", "constituted", "comprised"],
    meaningVi: "chiếm (tỷ lệ %) — thì quá khứ",
    takeaway: "was 40% of → accounted for / constituted 40% of",
    note: "Với số liệu phần trăm Task 1 (Pie/Table/Bar), 'accounted for', 'constituted', 'represented' ăn điểm hơn hẳn động từ 'was'.",
  },
  {
    id: "upg_8",
    kind: "upgrade",
    task: "task2",
    tag: "Task 2 · Importance",
    basicSentence: "Early education is very important for a child's future.",
    targetSentence: "Early childhood education ___ in shaping a child's long-term cognitive development.",
    canonical: "plays a crucial role",
    accepted: [
      "plays a crucial role",
      "plays a vital role",
      "plays a pivotal role",
      "plays an essential role",
      "plays a key role",
      "plays an important role",
    ],
    meaningVi: "đóng vai trò then chốt (4 từ)",
    takeaway: "is very important → plays a crucial / pivotal role",
    note: "Cấu trúc 'play a crucial/pivotal role in + V-ing' vừa tự nhiên vừa giúp tránh lạm dụng 'very important'.",
  },

  // -------------------- 2. ERROR HUNTER (Grammar & Tone Surgery) --------------------
  {
    id: "err_1",
    kind: "error",
    task: "task2",
    tag: "Grammar · Preposition",
    segments: [
      "Despite of",
      "heavy government investment,",
      "traffic congestion",
      "remains severe",
      "during peak hours.",
    ],
    errorIndex: 0,
    fixes: ["Despite", "Although of", "In spite"],
    correctFix: 0,
    takeaway: "Despite + N (KHÔNG đi với 'of')",
    note: "Lỗi kinh điển Band 5.5: 'Despite' không bao giờ đi với 'of'. Chỉ có 'Despite + N' hoặc 'In spite of + N'.",
  },
  {
    id: "err_2",
    kind: "error",
    task: "task1",
    tag: "Grammar · Subject-Verb",
    segments: [
      "The number of",
      "international students",
      "enrolled in engineering",
      "have risen steadily",
      "since 2015.",
    ],
    errorIndex: 3,
    fixes: ["has risen steadily", "are rising steadily", "were rising steadily"],
    correctFix: 0,
    takeaway: "The number of + N số nhiều → động từ SỐ ÍT",
    note: "'The number of...' lấy chủ ngữ chính là 'number' (số ít) nên phải chia 'has risen'; chỉ 'A number of...' mới chia số nhiều.",
  },
  {
    id: "err_3",
    kind: "error",
    task: "task2",
    tag: "Academic Tone",
    segments: [
      "Spending",
      "a lot of time",
      "on short-form videos",
      "can reduce",
      "sustained concentration.",
    ],
    errorIndex: 1,
    fixes: ["excessive amounts of time", "tons of time", "so much of time"],
    correctFix: 0,
    takeaway: "a lot of → excessive / substantial amounts of",
    note: "'a lot of' và 'tons of' mang văn phong nói; trong Task 2 nên dùng 'excessive amounts of' hoặc 'a considerable amount of'.",
  },
  {
    id: "err_4",
    kind: "error",
    task: "task2",
    tag: "Grammar · Verb Form",
    segments: [
      "Whether urban parks succeed",
      "is depend on",
      "consistent funding",
      "and active community",
      "maintenance.",
    ],
    errorIndex: 1,
    fixes: ["depends on", "is depending to", "are depend on"],
    correctFix: 0,
    takeaway: "depend là động từ thường (KHÔNG dùng 'is depend')",
    note: "Lỗi dịch sát tiếng Việt: 'depend' là động từ thường nên chia trực tiếp 'depends on', không ghép với 'is'.",
  },
  {
    id: "err_5",
    kind: "error",
    task: "task1",
    tag: "Grammar · Tense",
    segments: [
      "Between 2000 and 2010,",
      "solar capacity",
      "has increased threefold",
      "across all three",
      "European countries.",
    ],
    errorIndex: 2,
    fixes: ["increased threefold", "increases threefold", "will increase threefold"],
    correctFix: 0,
    takeaway: "Mốc quá khứ đóng (2000–2010) → Quá khứ đơn",
    note: "Khoảng thời gian đã kết thúc hoàn toàn trong quá khứ ('Between 2000 and 2010') bắt buộc dùng quá khứ đơn 'increased', không dùng hiện tại hoàn thành.",
  },
  {
    id: "err_6",
    kind: "error",
    task: "task2",
    tag: "Grammar · Modal",
    segments: [
      "With proper vocational training,",
      "young graduates",
      "can able to adapt",
      "more effectively to",
      "evolving job markets.",
    ],
    errorIndex: 2,
    fixes: ["are able to adapt", "can be able adapt", "able to adapting"],
    correctFix: 0,
    takeaway: "Không ghép 'can' với 'able to' (lặp nghĩa)",
    note: "Chỉ chọn một trong hai: 'can adapt' hoặc 'are able to adapt', tuyệt đối không viết 'can able to'.",
  },
  {
    id: "err_7",
    kind: "error",
    task: "task2",
    tag: "Grammar · Uncountable",
    segments: [
      "Public libraries provide",
      "many useful informations",
      "for residents who lack",
      "reliable home internet",
      "access.",
    ],
    errorIndex: 1,
    fixes: ["valuable information", "a lot of informations", "several information"],
    correctFix: 0,
    takeaway: "information là danh từ KHÔNG đếm được",
    note: "'information', 'advice', 'equipment', 'research' đều không đếm được — không thêm '-s' và không đi với 'many / several'.",
  },
  {
    id: "err_8",
    kind: "error",
    task: "task1",
    tag: "Grammar · Comparison",
    segments: [
      "In 2024, renewable energy",
      "was significantly",
      "more cheaper than",
      "coal-fired electricity",
      "in northern regions.",
    ],
    errorIndex: 2,
    fixes: ["cheaper than", "more cheap than", "most cheaper than"],
    correctFix: 0,
    takeaway: "Tránh so sánh kép ('more cheaper' → 'cheaper')",
    note: "Tính từ ngắn 'cheap' đã có dạng so sánh hơn 'cheaper'; dùng trạng từ nhấn mạnh 'significantly cheaper than' chứ không thêm 'more'.",
  },

  // -------------------- 3. BUILD (Band 8 Complex Sentence Builder) --------------------
  {
    id: "bld_1",
    kind: "build",
    task: "task1",
    tag: "Task 1 · Overview (While)",
    promptVi: "Dựng câu Overview: Trong khi lượng khách đi tàu điện tăng đều, lượng khách đi xe buýt lại giảm dần trong suốt giai đoạn.",
    tiles: [
      "Overall,",
      "while rail passenger numbers",
      "rose steadily,",
      "bus ridership experienced",
      "a gradual decline",
      "over the period.",
    ],
    takeaway: "Overall, while [xu hướng A], [xu hướng B]...",
    note: "Cấu trúc mệnh đề nhượng bộ 'Overall, while A rose..., B declined...' là công thức Overview Band 8 gọn và sắc nét nhất cho Task 1.",
  },
  {
    id: "bld_2",
    kind: "build",
    task: "task2",
    tag: "Task 2 · Thesis (Although)",
    promptVi: "Dựng câu Thesis: Dù học trực tuyến mang lại sự linh hoạt, tôi tin rằng tương tác trực tiếp vẫn thiết yếu với trẻ nhỏ.",
    tiles: [
      "Although online learning",
      "offers undeniable flexibility,",
      "I believe that",
      "face-to-face interaction",
      "remains essential",
      "for young learners.",
    ],
    takeaway: "Although [quan điểm đối lập], I believe that [lập trường]",
    note: "Câu Thesis dạng nhượng bộ thể hiện tư duy cân bằng (balanced view) và mở đường rõ ràng cho 2 đoạn thân bài.",
  },
  {
    id: "bld_3",
    kind: "build",
    task: "task2",
    tag: "Task 2 · Inversion (Not only)",
    promptVi: "Dựng câu đảo ngữ: Không gian xanh không chỉ cải thiện chất lượng không khí mà còn tăng cường sức khỏe tinh thần.",
    tiles: [
      "Not only do",
      "urban green spaces",
      "improve air quality,",
      "but they also",
      "enhance residents'",
      "mental well-being.",
    ],
    takeaway: "Not only + trợ động từ + S + V, but S + also + V",
    note: "Đảo ngữ với 'Not only do...' là điểm cộng lớn cho tiêu chí Grammatical Range and Accuracy (GRA) khi dùng đúng ngữ cảnh.",
  },
  {
    id: "bld_4",
    kind: "build",
    task: "task1",
    tag: "Task 1 · Passive Process",
    promptVi: "Dựng câu Process (bị động): Sau khi được phân loại, chai nhựa được rửa sạch và nghiền thành những mảnh nhỏ.",
    tiles: [
      "Once sorted,",
      "the plastic bottles",
      "are thoroughly washed",
      "and shredded into",
      "small uniform flakes.",
    ],
    takeaway: "Once + V3/ed, S + be + V3/ed (mệnh đề rút gọn bị động)",
    note: "Trong dạng Process Task 1, rút gọn mệnh đề 'Once sorted,' kết hợp bị động hiện tại đơn giúp mạch văn cực kỳ học thuật.",
  },
  {
    id: "bld_5",
    kind: "build",
    task: "task2",
    tag: "Task 2 · Relative Clause",
    promptVi: "Dựng câu mệnh đề quan hệ: Chính phủ nên đầu tư vào giao thông công cộng, điều mà có thể giảm đáng kể khí thải.",
    tiles: [
      "Governments should invest",
      "in affordable public transit,",
      "which could significantly",
      "curb carbon emissions",
      "in congested cities.",
    ],
    takeaway: "Mệnh đề chính, which + modal + V (mệnh đề quan hệ nối cả câu)",
    note: "Dùng ', which could...' để nói về hệ quả tích cực của cả giải pháp trước đó giúp câu văn mượt mà chuẩn Band 8.",
  },
  {
    id: "bld_6",
    kind: "build",
    task: "task1",
    tag: "Task 1 · Superlative + Contrast",
    promptVi: "Dựng câu so sánh: Đáng chú ý, nhà ở chiếm tỷ trọng chi tiêu lớn nhất, trái ngược hẳn với mức chi khiêm tốn cho giải trí.",
    tiles: [
      "Notably, housing accounted",
      "for the largest share",
      "of household spending,",
      "in stark contrast to",
      "the modest allocation",
      "for leisure.",
    ],
    takeaway: "Notably, [nhóm cao nhất], in stark contrast to [nhóm thấp nhất]",
    note: "Cụm 'in stark contrast to' giúp đối chiếu cực trị (cao nhất vs thấp nhất) trong Pie Chart hoặc Table cực kỳ ấn tượng.",
  },
  {
    id: "bld_7",
    kind: "build",
    task: "task2",
    tag: "Task 2 · Topic Sentence",
    promptVi: "Dựng câu chủ đề: Một lý do chính khiến giới trẻ trì hoãn mua nhà là khoảng cách ngày càng lớn giữa thu nhập và giá bất động sản.",
    tiles: [
      "A primary reason why",
      "young adults delay",
      "purchasing a home",
      "is the widening gap",
      "between wages and",
      "property prices.",
    ],
    takeaway: "A primary reason why [S + V] is [cụm danh từ học thuật]",
    note: "Topic sentence rõ ràng, ngắn gọn và dùng cụm danh từ 'the widening gap between...' giúp điểm Coherence & Cohesion đạt 8.0+.",
  },
  {
    id: "bld_8",
    kind: "build",
    task: "task2",
    tag: "Task 2 · Conclusion",
    promptVi: "Dựng câu kết bài: Tóm lại, dù công nghệ mang lại một số rủi ro, lợi ích lâu dài với giáo dục vẫn vượt trội hơn hẳn.",
    tiles: [
      "In conclusion,",
      "despite certain risks",
      "associated with technology,",
      "its long-term educational",
      "benefits far outweigh",
      "the drawbacks.",
    ],
    takeaway: "In conclusion, despite [nhược điểm], [lợi ích] far outweigh the drawbacks",
    note: "Động từ 'far outweigh' kết hợp cụm 'despite certain risks associated with...' là câu kết chuẩn mực cho dạng Advantages/Disadvantages.",
  },
];
