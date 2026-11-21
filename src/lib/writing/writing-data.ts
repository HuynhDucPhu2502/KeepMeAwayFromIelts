// Curated IELTS Writing Task 1 & Task 2 Sprint dataset (derived from ielts-corpus-lab/data/writing.json).
// Self-contained in the app so Docker / Cloud Run builds require no external data directory.

export type Task1Visual =
  | {
      type: "line";
      title: string;
      unit: string;
      labels: string[];
      series: { name: string; values: number[] }[];
    }
  | {
      type: "bar";
      title: string;
      unit: string;
      labels: string[];
      series: { name: string; values: number[] }[];
    }
  | {
      type: "pie";
      title: string;
      panels: { title: string; segments: { label: string; value: number }[] }[];
    }
  | {
      type: "table";
      title: string;
      headers: string[];
      rows: (string | number)[][];
    }
  | {
      type: "map";
      title: string;
      panels: { title: string; grid: string[][] }[];
    }
  | {
      type: "process";
      title: string;
      stages: string[];
    }
  | {
      type: "mixed";
      title: string;
      labels: string[];
      bars: { name: string; unit: string; values: number[] };
      line: { name: string; unit: string; values: number[] };
    }
  | {
      type: "system";
      title: string;
      stages: string[];
      outputs: string[];
    };

export interface ChoiceChallenge {
  id: string;
  task: "task1" | "task2";
  kind: "fix" | "cloze" | "verify";
  tag: string;
  exerciseId: string;
  /** Sentence with either `{{highlight}}` (error to fix) or `___` (blank to fill). */
  sentence: string;
  choices: string[];
  answer: number;
  takeaway: string;
  note: string;
}

export interface OrderChallenge {
  id: string;
  task: "task2";
  kind: "order";
  tag: string;
  exerciseId: string;
  instruction: string;
  /** Correct logical order of 4 short sentences/blocks (Intro -> Body 1 -> Body 2 -> Conclusion). */
  steps: { role: string; text: string }[];
  takeaway: string;
  note: string;
}

export type WritingChallenge = ChoiceChallenge | OrderChallenge;

export interface WritingExercise {
  id: string;
  task: "task1" | "task2";
  typeLabel: string;
  titleEn: string;
  titleVi: string;
  question: string;
  visual?: Task1Visual;
  vocab: string[];
}

export const WRITING_EXERCISES: Record<string, WritingExercise> = {
  t1_line: {
    id: "t1_line",
    task: "task1",
    typeLabel: "Biểu đồ đường",
    titleEn: "Metro passenger trends",
    titleVi: "Lượt khách đi tàu điện ngầm",
    question: "Lượt hành khách trên 2 tuyến Metro A & B tại Norchester (2010–2024).",
    vocab: ["rise steadily", "overtake", "stand at", "by contrast", "a widening gap"],
    visual: {
      type: "line",
      title: "Passenger journeys on two metro lines",
      unit: "triệu lượt",
      labels: ["2010", "2015", "2020", "2024"],
      series: [
        { name: "Line A", values: [42, 58, 76, 91] },
        { name: "Line B", values: [70, 68, 61, 55] },
      ],
    },
  },
  t1_bar: {
    id: "t1_bar",
    task: "task1",
    typeLabel: "Biểu đồ cột",
    titleEn: "Graduate destinations",
    titleVi: "Đầu ra sinh viên tốt nghiệp",
    question: "Tỷ lệ (%) sinh viên đi làm, học tiếp hoặc chưa có việc ở 3 trường đại học (2025).",
    vocab: ["account for", "the dominant outcome", "by comparison", "percentage points", "respectively"],
    visual: {
      type: "bar",
      title: "Destinations of graduates in 2025",
      unit: "%",
      labels: ["North Uni", "Central Uni", "South Uni"],
      series: [
        { name: "Employment", values: [68, 55, 74] },
        { name: "Further study", values: [25, 35, 18] },
        { name: "Unemployed", values: [7, 10, 8] },
      ],
    },
  },
  t1_pie: {
    id: "t1_pie",
    task: "task1",
    typeLabel: "Biểu đồ tròn",
    titleEn: "Household heating sources",
    titleVi: "Nguồn năng lượng sưởi ấm",
    question: "Tỷ trọng 4 nguồn năng lượng sưởi ấm hộ gia đình ở Bellford năm 2000 và 2025.",
    vocab: ["make up", "combined share", "a marked shift", "triple", "fossil fuels"],
    visual: {
      type: "pie",
      title: "Energy used for household heating (%)",
      panels: [
        {
          title: "2000",
          segments: [
            { label: "Gas", value: 45 },
            { label: "Coal", value: 30 },
            { label: "Electricity", value: 15 },
            { label: "Renewables", value: 10 },
          ],
        },
        {
          title: "2025",
          segments: [
            { label: "Gas", value: 30 },
            { label: "Coal", value: 10 },
            { label: "Electricity", value: 25 },
            { label: "Renewables", value: 35 },
          ],
        },
      ],
    },
  },
  t1_table: {
    id: "t1_table",
    task: "task1",
    typeLabel: "Bảng số liệu",
    titleEn: "Monthly student spending",
    titleVi: "Chi tiêu hàng tháng của sinh viên",
    question: "Chi tiêu trung bình hàng tháng ($) của sinh viên tại 3 thành phố năm 2025.",
    vocab: ["by far the largest item", "range from ... to ...", "combined total", "by contrast", "respectively"],
    visual: {
      type: "table",
      title: "Average monthly student spending in 2025 ($)",
      headers: ["Category", "Riverport", "Hillford", "Coaston"],
      rows: [
        ["Rent", 520, 430, 610],
        ["Food", 210, 230, 220],
        ["Transport", 60, 90, 70],
        ["Leisure", 110, 80, 130],
      ],
    },
  },
  t1_map: {
    id: "t1_map",
    task: "task1",
    typeLabel: "Bản đồ quy hoạch",
    titleEn: "Public library redevelopment",
    titleVi: "Cải tạo thư viện công cộng",
    question: "So sánh mặt bằng Westbridge Public Library năm 2010 và bản đề xuất 2025.",
    vocab: ["be converted into", "be replaced by", "remain in place", "in the north-western corner", "be upgraded to"],
    visual: {
      type: "map",
      title: "Westbridge Public Library",
      panels: [
        {
          title: "2010",
          grid: [
            ["Staff office", "Book shelves", "Book shelves"],
            ["Entrance", "Service desk", "Reading area"],
            ["Storage", "Computers", "Children's room"],
          ],
        },
        {
          title: "Proposed 2025",
          grid: [
            ["Café", "Book shelves", "Study pods"],
            ["Entrance", "Self-service", "Community hall"],
            ["Toilets", "Digital lab", "Children's room"],
          ],
        },
      ],
    },
  },
  t1_process: {
    id: "t1_process",
    task: "task1",
    typeLabel: "Quy trình",
    titleEn: "Recycled paper production",
    titleVi: "Quy trình tái chế giấy",
    question: "Các công đoạn biến giấy văn phòng bỏ đi thành cuộn giấy tái chế mới.",
    vocab: ["six-stage procedure", "remove impurities", "wet pulp", "subsequently", "the finished product"],
    visual: {
      type: "process",
      title: "Recycling used office paper",
      stages: [
        "Collection",
        "Sorting",
        "Shredding & pulping",
        "Cleaning & de-inking",
        "Pressing & drying",
        "Rolling & packaging",
      ],
    },
  },
  t1_mixed: {
    id: "t1_mixed",
    task: "task1",
    typeLabel: "Biểu đồ kết hợp",
    titleEn: "Bike-share use & satisfaction",
    titleVi: "Xe đạp công cộng & mức hài lòng",
    question: "Số chuyến đi mỗi tháng (nghìn chuyến) và tỷ lệ người dùng hài lòng (%) tại Easton (2021–2024).",
    vocab: ["more than double", "percentage points", "the sharpest rise", "upward path", "reach a peak of"],
    visual: {
      type: "mixed",
      title: "Easton bike-share scheme (2021–2024)",
      labels: ["2021", "2022", "2023", "2024"],
      bars: { name: "Monthly trips", unit: "k", values: [22, 29, 41, 48] },
      line: { name: "Satisfied users", unit: "%", values: [62, 68, 75, 79] },
    },
  },
  t1_system: {
    id: "t1_system",
    task: "task1",
    typeLabel: "Sơ đồ hệ thống",
    titleEn: "Domestic rainwater system",
    titleVi: "Hệ thống thu gom nước mưa",
    question: "Cách thu gom, lọc, trữ và tái sử dụng nước mưa trong nhà thân thiện môi trường.",
    vocab: ["catchment surface", "pass through", "non-potable use", "excess water", "be diverted to"],
    visual: {
      type: "system",
      title: "Rainwater collection and reuse",
      stages: ["Roof catchment", "Gutter", "Mesh filter", "Underground tank", "Pump"],
      outputs: ["Toilets & laundry", "Garden irrigation", "Overflow soakaway"],
    },
  },
  t2_theory: {
    id: "t2_theory",
    task: "task2",
    typeLabel: "Agree / Disagree",
    titleEn: "Practical skills vs theory",
    titleVi: "Kỹ năng thực hành hay kiến thức lý thuyết",
    question:
      "Some people believe that universities should focus mainly on practical job skills rather than theoretical knowledge. To what extent do you agree or disagree?",
    vocab: ["transferable knowledge", "apply principles", "integrated with", "long-term adaptability"],
  },
  t2_money: {
    id: "t2_money",
    task: "task2",
    typeLabel: "Discuss Both Views",
    titleEn: "Teaching children about money",
    titleVi: "Dạy trẻ quản lý tài chính",
    question:
      "Some people think schools should teach children how to manage money, while others believe this is the responsibility of parents. Discuss both views and give your own opinion.",
    vocab: ["financial literacy", "regardless of", "compound interest", "complementary"],
  },
  t2_remote: {
    id: "t2_remote",
    task: "task2",
    typeLabel: "Advantages / Disadvantages",
    titleEn: "The expansion of remote work",
    titleVi: "Làm việc từ xa ngày càng phổ biến",
    question:
      "Remote work has become common in many industries. Do the advantages of this trend outweigh the disadvantages?",
    vocab: ["outweigh", "geographical barriers", "informal conversations", "hybrid days"],
  },
  t2_news: {
    id: "t2_news",
    task: "task2",
    typeLabel: "Positive / Negative",
    titleEn: "News through social media",
    titleVi: "Đọc tin tức qua mạng xã hội",
    question:
      "More people now get their news from social media rather than printed newspapers. Is this a positive or negative development?",
    vocab: ["primary gateway", "editorial verification", "media literacy", "provoke anger"],
  },
  t2_cities: {
    id: "t2_cities",
    task: "task2",
    typeLabel: "Two-part Question",
    titleEn: "Young people moving to cities",
    titleVi: "Người trẻ rời quê lên thành phố",
    question:
      "Why are young adults increasingly moving from small towns to major cities, and what measures can help smaller communities retain them?",
    vocab: ["opportunity gap", "career progression", "tax incentives", "sustained investment"],
  },
  t2_waste: {
    id: "t2_waste",
    task: "task2",
    typeLabel: "Causes & Solutions",
    titleEn: "Growing household waste",
    titleVi: "Rác thải sinh hoạt gia tăng",
    question:
      "Household waste continues to rise despite wider recycling services. What are the main causes of this problem, and what actions can governments and individuals take?",
    vocab: ["single-use packaging", "deposit-return schemes", "producer responsibility", "waste prevention"],
  },
};

export const WRITING_CHALLENGES: WritingChallenge[] = [
  // --- Task 1: Line ---
  {
    id: "t1_line_1",
    task: "task1",
    kind: "fix",
    tag: "Sửa lỗi xu hướng",
    exerciseId: "t1_line",
    sentence: "Overall, passenger journeys on Line B {{rose steadily}} from 2010 to 2024.",
    choices: ["declined gradually", "rose steadily", "remained unchanged"],
    answer: 0,
    takeaway: "declined gradually",
    note: "Line B giảm từ 70 → 55 triệu lượt nên phải dùng cụm tả xu hướng giảm nhẹ: “declined gradually”.",
  },
  {
    id: "t1_line_2",
    task: "task1",
    kind: "cloze",
    tag: "Điền cụm điểm cắt",
    exerciseId: "t1_line",
    sentence: "Although Line B started ahead, Line A ___ it between 2015 and 2020.",
    choices: ["overtook", "stood at", "slipped below"],
    answer: 0,
    takeaway: "overtook",
    note: "Line A tăng từ 58 → 76 còn Line B giảm 68 → 61 ⇒ dùng “overtook” (vượt mặt) rất chuẩn Band 8.",
  },
  {
    id: "t1_line_3",
    task: "task1",
    kind: "verify",
    tag: "Soi số liệu",
    exerciseId: "t1_line",
    sentence: "By 2024, Line A reached 91 million journeys, more than double its 2010 level (42 million).",
    choices: ["Chuẩn số liệu ✓", "Sai số liệu ✕"],
    answer: 0,
    takeaway: "more than double",
    note: "42 × 2 = 84 < 91 ⇒ “more than double its starting level” chuẩn tuyệt đối!",
  },

  // --- Task 1: Bar ---
  {
    id: "t1_bar_1",
    task: "task1",
    kind: "cloze",
    tag: "Điền cụm tỷ trọng",
    exerciseId: "t1_bar",
    sentence: "Overall, unemployment ___ the smallest proportion at all three universities.",
    choices: ["accounted for", "overtook", "diverted to"],
    answer: 0,
    takeaway: "accounted for",
    note: "Khi tả tỷ lệ phần trăm trong biểu đồ cột/tròn, dùng “account for” (chiếm tỷ trọng).",
  },
  {
    id: "t1_bar_2",
    task: "task1",
    kind: "fix",
    tag: "Sửa sai đơn vị",
    exerciseId: "t1_bar",
    sentence: "At South University, 74% found work, six {{percent more}} than North University (68%).",
    choices: ["percentage points higher", "percent higher", "times higher"],
    answer: 0,
    takeaway: "percentage points",
    note: "Hiệu giữa 74% và 68% là “6 percentage points” (điểm phần trăm), không viết “6 percent” để tránh hiểu nhầm tỷ lệ tương đối!",
  },
  {
    id: "t1_bar_3",
    task: "task1",
    kind: "verify",
    tag: "Soi số liệu",
    exerciseId: "t1_bar",
    sentence: "Central University recorded both the highest employment rate and the lowest further-study share.",
    choices: ["Chuẩn số liệu ✓", "Sai số liệu ✕"],
    answer: 1,
    takeaway: "compare extremes accurately",
    note: "Ngược rồi! Central có tỷ lệ đi làm THẤP nhất (55%) và học tiếp CAO nhất (35%).",
  },

  // --- Task 1: Pie ---
  {
    id: "t1_pie_1",
    task: "task1",
    kind: "cloze",
    tag: "Điền cụm tăng gấp bội",
    exerciseId: "t1_pie",
    sentence: "By 2025, renewable energy ___ to 35% and became the largest individual source.",
    choices: ["more than tripled", "halved", "dropped slightly"],
    answer: 0,
    takeaway: "more than tripled",
    note: "Renewables tăng từ 10% (2000) lên 35% (2025) → hơn gấp 3 lần (“more than tripled”).",
  },
  {
    id: "t1_pie_2",
    task: "task1",
    kind: "fix",
    tag: "Sửa lỗi Overview",
    exerciseId: "t1_pie",
    sentence: "Overall, household heating shifted away from {{renewables}} towards fossil fuels.",
    choices: ["fossil fuels", "renewables", "electricity"],
    answer: 0,
    takeaway: "shifted away from",
    note: "Gas + Coal (fossil fuels) giảm tổng cộng từ 75% xuống 40% ⇒ phải là “shifted away from fossil fuels”.",
  },
  {
    id: "t1_pie_3",
    task: "task1",
    kind: "verify",
    tag: "Soi số liệu",
    exerciseId: "t1_pie",
    sentence: "In 2000, gas and coal together accounted for three quarters (75%) of total heating energy.",
    choices: ["Chuẩn số liệu ✓", "Sai số liệu ✕"],
    answer: 0,
    takeaway: "three quarters",
    note: "45% (Gas) + 30% (Coal) = 75% = “three quarters” — đổi % sang phân số giúp ăn điểm Lexical Resource!",
  },

  // --- Task 1: Table ---
  {
    id: "t1_table_1",
    task: "task1",
    kind: "cloze",
    tag: "Điền cụm nổi bật",
    exerciseId: "t1_table",
    sentence: "Rent was ___ the largest item in every city, ranging from $430 to $610.",
    choices: ["by far", "slightly", "marginally"],
    answer: 0,
    takeaway: "by far the largest",
    note: "Tiền thuê nhà ($430–$610) vượt xa mọi khoản khác ⇒ dùng “by far the largest item”.",
  },
  {
    id: "t1_table_2",
    task: "task1",
    kind: "fix",
    tag: "Sửa so sánh thành phố",
    exerciseId: "t1_table",
    sentence: "Food spending varied {{dramatically}}, ranging from $210 in Riverport to $230 in Hillford.",
    choices: ["only slightly", "dramatically", "sharply"],
    answer: 0,
    takeaway: "varied only slightly",
    note: "$210, $220 và $230 chỉ chênh $20 ⇒ phải dùng “varied only slightly” (dao động rất ít).",
  },
  {
    id: "t1_table_3",
    task: "task1",
    kind: "verify",
    tag: "Soi số liệu",
    exerciseId: "t1_table",
    sentence: "Hillford students spent the most on transport ($90), while Riverport spent the least ($60).",
    choices: ["Chuẩn số liệu ✓", "Sai số liệu ✕"],
    answer: 0,
    takeaway: "contrast extremes",
    note: "Đúng! Hàng Transport là Riverport $60, Hillford $90, Coaston $70.",
  },

  // --- Task 1: Map ---
  {
    id: "t1_map_1",
    task: "task1",
    kind: "cloze",
    tag: "Điền bị động tả bản đồ",
    exerciseId: "t1_map",
    sentence: "Under the 2025 proposal, the staff office in the north-west will ___ a café.",
    choices: ["be converted into", "remain in place as", "flow through"],
    answer: 0,
    takeaway: "be converted into",
    note: "Tả phòng/công trình đổi công năng trong Map Task 1: dùng bị động “be converted into”.",
  },
  {
    id: "t1_map_2",
    task: "task1",
    kind: "fix",
    tag: "Sửa vị trí không đổi",
    exerciseId: "t1_map",
    sentence: "The entrance and the {{service desk}} will remain in their original positions.",
    choices: ["children's room", "service desk", "storage room"],
    answer: 0,
    takeaway: "remain in their original positions",
    note: "Service desk bị thay bằng Self-service; chỉ Entrance, Book shelves (giữa) và Children's room giữ nguyên vị trí.",
  },
  {
    id: "t1_map_3",
    task: "task1",
    kind: "cloze",
    tag: "Điền động từ thay thế",
    exerciseId: "t1_map",
    sentence: "In the centre of the library, the staffed service desk will ___ self-service machines.",
    choices: ["be replaced by", "overtake", "account for"],
    answer: 0,
    takeaway: "be replaced by",
    note: "Khi một hạng mục cũ bị bỏ và thay bằng hạng mục mới: “be replaced by”.",
  },

  // --- Task 1: Process ---
  {
    id: "t1_proc_1",
    task: "task1",
    kind: "cloze",
    tag: "Điền từ nối quy trình",
    exerciseId: "t1_process",
    sentence: "Once cleaned, the pulp is pressed to remove water and ___ heated and dried.",
    choices: ["subsequently", "by contrast", "whereas"],
    answer: 0,
    takeaway: "subsequently",
    note: "Tả bước kế tiếp trong quy trình (Process): dùng “subsequently” (tiếp theo đó) thay vì lặp “then”.",
  },
  {
    id: "t1_proc_2",
    task: "task1",
    kind: "verify",
    tag: "Soi thứ tự công đoạn",
    exerciseId: "t1_process",
    sentence: "In the diagram, paper is cleaned and de-inked before it is sorted and shredded.",
    choices: ["Chuẩn quy trình ✓", "Sai thứ tự ✕"],
    answer: 1,
    takeaway: "track stage order",
    note: "Sai thứ tự! Giấy được phân loại (Sorting) và nghiền (Shredding) TRƯỚC khi rửa tách mực (Cleaning & de-inking).",
  },
  {
    id: "t1_proc_3",
    task: "task1",
    kind: "cloze",
    tag: "Điền câu Overview Process",
    exerciseId: "t1_process",
    sentence: "Overall, recycling office paper is a linear, ___ procedure ending in new paper rolls.",
    choices: ["six-stage", "two-way", "declining"],
    answer: 0,
    takeaway: "a linear, six-stage procedure",
    note: "Câu Overview chuẩn mực cho Process luôn nêu rõ cấu trúc (linear / cyclical) + tổng số giai đoạn!",
  },

  // --- Task 1: Mixed ---
  {
    id: "t1_mix_1",
    task: "task1",
    kind: "cloze",
    tag: "Điền điểm tăng mạnh nhất",
    exerciseId: "t1_mixed",
    sentence: "The ___ annual rise in monthly trips occurred between 2022 and 2023 (+12,000).",
    choices: ["sharpest", "smallest", "slowest"],
    answer: 0,
    takeaway: "the sharpest annual rise",
    note: "2021→2022 (+7k), 2022→2023 (+12k), 2023→2024 (+7k) ⇒ 2022–2023 là “the sharpest annual rise”.",
  },
  {
    id: "t1_mix_2",
    task: "task1",
    kind: "verify",
    tag: "Soi biểu đồ kết hợp",
    exerciseId: "t1_mixed",
    sentence: "Between 2021 and 2024, monthly trips more than doubled while user satisfaction rose by 17 percentage points.",
    choices: ["Chuẩn số liệu ✓", "Sai số liệu ✕"],
    answer: 0,
    takeaway: "combine both charts in Overview",
    note: "22k → 48k (hơn gấp đôi) và 62% → 79% (+17 điểm %) — câu Overview gom gọn cả 2 biểu đồ rất đẹp!",
  },

  // --- Task 1: System ---
  {
    id: "t1_sys_1",
    task: "task1",
    kind: "cloze",
    tag: "Điền cụm hệ thống",
    exerciseId: "t1_system",
    sentence: "If the underground tank is full, excess water ___ an overflow soakaway in the garden.",
    choices: ["is diverted to", "stands at", "accounts for"],
    answer: 0,
    takeaway: "is diverted to",
    note: "Tả dòng chảy được chuyển hướng trong sơ đồ hệ thống: “is diverted to”.",
  },
  {
    id: "t1_sys_2",
    task: "task1",
    kind: "fix",
    tag: "Sửa công dụng nước",
    exerciseId: "t1_system",
    sentence: "Treated rainwater supplies toilets, laundry and garden irrigation — all {{drinking}} uses.",
    choices: ["non-potable", "drinking", "industrial"],
    answer: 0,
    takeaway: "non-potable uses",
    note: "Nước xả bồn cầu, giặt giũ và tưới cây là nước không uống trực tiếp ⇒ từ ăn điểm: “non-potable uses”.",
  },

  // --- Task 2: Practical skills vs Theory ---
  {
    id: "t2_theory_1",
    task: "task2",
    kind: "cloze",
    tag: "Từ nối phản biện",
    exerciseId: "t2_theory",
    sentence: "Software tools may expire in a few years, ___ scientific principles remain useful for decades.",
    choices: ["whereas", "therefore", "for instance"],
    answer: 0,
    takeaway: "whereas",
    note: "Đặt 2 vế tương phản cạnh nhau trong cùng 1 câu phức → dùng “whereas” giúp tăng điểm ngữ pháp (GRA).",
  },
  {
    id: "t2_theory_2",
    task: "task2",
    kind: "cloze",
    tag: "Collocation học thuật",
    exerciseId: "t2_theory",
    sentence: "Internships work best when they are ___ rigorous academic study rather than replacing it.",
    choices: ["integrated with", "diverted from", "overtaken by"],
    answer: 0,
    takeaway: "integrated with",
    note: "“integrated with” (lồng ghép với) tự nhiên và học thuật hơn nhiều so với “put together with”.",
  },
  {
    id: "t2_theory_order",
    task: "task2",
    kind: "order",
    tag: "Xếp mạch 4 đoạn",
    exerciseId: "t2_theory",
    instruction: "Bấm chọn 4 đoạn theo đúng mạch lập luận của bài Opinion (Mở bài → Thân bài 1 → Thân bài 2 → Kết luận):",
    steps: [
      {
        role: "Mở bài",
        text: "Although students need chances to apply what they learn, I disagree that job skills should replace theory.",
      },
      {
        role: "Thân bài 1 (Lý do chính)",
        text: "The central value of a university is durable knowledge that stays useful when specific tools change.",
      },
      {
        role: "Thân bài 2 (Nhượng bộ & cân bằng)",
        text: "This does not mean courses should ignore practice; placements work best when integrated with study.",
      },
      {
        role: "Kết luận",
        text: "In conclusion, universities should prioritise critical thinking supported by well-designed practical experience.",
      },
    ],
    takeaway: "Thesis → Core Argument → Concession → Conclusion",
    note: "Mạch Opinion Band 8: Nêu lập trường rõ → Chứng minh ý chính → Nhượng bộ có giới hạn → Chốt lại hướng giải pháp.",
  },

  // --- Task 2: Teaching children about money ---
  {
    id: "t2_money_1",
    task: "task2",
    kind: "cloze",
    tag: "Collocation chủ đề",
    exerciseId: "t2_money",
    sentence: "School-based ___ reaches every child regardless of their family background.",
    choices: ["financial literacy", "money knowing", "cash talking"],
    answer: 0,
    takeaway: "financial literacy",
    note: "“financial literacy” (kiến thức tài chính) là cụm từ khoá Band 8 chuẩn nhất cho chủ đề dạy quản lý tiền.",
  },
  {
    id: "t2_money_2",
    task: "task2",
    kind: "fix",
    tag: "Nâng từ Band 5 → Band 8",
    exerciseId: "t2_money",
    sentence: "In my opinion, the roles of schools and parents should {{help each other}}.",
    choices: ["be complementary", "help each other", "do the same thing"],
    answer: 0,
    takeaway: "be complementary",
    note: "Thay “help each other” bằng “be complementary” (bổ trợ lẫn nhau) nâng hẳn tiêu chí Lexical Resource!",
  },
  {
    id: "t2_money_order",
    task: "task2",
    kind: "order",
    tag: "Xếp mạch 4 đoạn",
    exerciseId: "t2_money",
    instruction: "Sắp xếp 4 đoạn theo đúng cấu trúc bài Discuss Both Views:",
    steps: [
      {
        role: "Mở bài",
        text: "There is debate about whether schools or parents should teach money management; I believe both are essential.",
      },
      {
        role: "Thân bài 1 (Vai trò nhà trường)",
        text: "Supporters of school courses point out that structured lessons reach children regardless of family background.",
      },
      {
        role: "Thân bài 2 (Vai trò cha mẹ)",
        text: "However, parents can turn abstract principles into daily habits through real shopping and saving choices.",
      },
      {
        role: "Kết luận",
        text: "In my opinion, the two roles should be complementary, combining equal access with realistic practice at home.",
      },
    ],
    takeaway: "Both views + clear personal stance",
    note: "Bài Discuss Both Views luôn trình bày công bằng 2 phía ở 2 đoạn thân bài rồi khẳng định quan điểm cá nhân nhất quán.",
  },

  // --- Task 2: Remote work ---
  {
    id: "t2_remote_1",
    task: "task2",
    kind: "cloze",
    tag: "Từ nối chuyển ý mạnh",
    exerciseId: "t2_remote",
    sentence: "The drawbacks are genuine. ___, remote work produces wider and more measurable benefits.",
    choices: ["Nevertheless", "For example", "In other words"],
    answer: 0,
    takeaway: "Nevertheless",
    note: "Chuyển từ đoạn nhược điểm sang đoạn ưu điểm lớn hơn → dùng “Nevertheless” (Tuy nhiên) rất sắc bén.",
  },
  {
    id: "t2_remote_2",
    task: "task2",
    kind: "fix",
    tag: "Nâng từ Band 5 → Band 8",
    exerciseId: "t2_remote",
    sentence: "Remote hiring removes {{place limits}} so people in small towns can compete for top roles.",
    choices: ["geographical barriers", "place limits", "map problems"],
    answer: 0,
    takeaway: "geographical barriers",
    note: "“removes geographical barriers” (xoá bỏ rào cản địa lý) là collocation tự nhiên cực ghi điểm trong Task 2.",
  },
  {
    id: "t2_remote_order",
    task: "task2",
    kind: "order",
    tag: "Xếp mạch 4 đoạn",
    exerciseId: "t2_remote",
    instruction: "Sắp xếp 4 đoạn theo đúng cấu trúc bài Advantages Outweigh Disadvantages:",
    steps: [
      {
        role: "Mở bài",
        text: "While remote work can weaken social contact, I believe its advantages outweigh these problems when managed well.",
      },
      {
        role: "Thân bài 1 (Nhược điểm trước)",
        text: "The disadvantages are genuine: new staff learn more slowly and home workers may experience loneliness.",
      },
      {
        role: "Thân bài 2 (Ưu điểm vượt trội)",
        text: "Nevertheless, eliminating commutes saves time and removes geographical barriers from recruitment.",
      },
      {
        role: "Kết luận",
        text: "Since most drawbacks can be reduced through hybrid days, remote work is a positive development overall.",
      },
    ],
    takeaway: "Weaker side first → Stronger side second",
    note: "Mẹo ăn điểm Coherence: Đặt phía yếu hơn ở Body 1 rồi dùng “Nevertheless” bật sang phía bạn ủng hộ ở Body 2!",
  },

  // --- Task 2: Social media news ---
  {
    id: "t2_news_1",
    task: "task2",
    kind: "cloze",
    tag: "Collocation báo chí",
    exerciseId: "t2_news",
    sentence: "Speed creates pressure to publish before information has undergone ___.",
    choices: ["editorial verification", "fast typing", "daily circulation"],
    answer: 0,
    takeaway: "editorial verification",
    note: "“undergo editorial verification” (trải qua kiểm chứng biên tập) rất đắt cho chủ đề truyền thông.",
  },
  {
    id: "t2_news_2",
    task: "task2",
    kind: "fix",
    tag: "Nâng từ Band 5 → Band 8",
    exerciseId: "t2_news",
    sentence: "Schools should teach {{how to read news smartly}} so citizens spot false claims.",
    choices: ["media literacy", "news smartness", "reading internet"],
    answer: 0,
    takeaway: "media literacy",
    note: "“media literacy” (năng lực đọc hiểu và phản biện truyền thông) gọn, chuẩn học thuật Band 8+.",
  },
  {
    id: "t2_news_order",
    task: "task2",
    kind: "order",
    tag: "Xếp mạch 4 đoạn",
    exerciseId: "t2_news",
    instruction: "Sắp xếp 4 đoạn cho bài Positive or Negative Development:",
    steps: [
      {
        role: "Mở bài",
        text: "Although social media makes news faster, I view this as a mainly negative development due to lower reliability.",
      },
      {
        role: "Thân bài 1 (Mặt tích cực)",
        text: "There are clear advantages: updates arrive within minutes and help residents during emergencies.",
      },
      {
        role: "Thân bài 2 (Rủi ro lớn hơn)",
        text: "However, algorithms reward outrage and false claims spread thousands of times before corrections appear.",
      },
      {
        role: "Kết luận",
        text: "Overall, wider access does not compensate for damaged reliability until stronger safeguards are normal.",
      },
    ],
    takeaway: "Acknowledge benefits → Prove deeper harm",
    note: "Thừa nhận lợi ích tốc độ trước rồi chỉ ra lỗi hệ thống của thuật toán khiến lập luận khách quan và thuyết phục hơn.",
  },

  // --- Task 2: Young people moving to cities ---
  {
    id: "t2_cities_1",
    task: "task2",
    kind: "cloze",
    tag: "Collocation đô thị hoá",
    exerciseId: "t2_cities",
    sentence: "Moving to a major city is a rational response to an ___ rather than rejecting one's hometown.",
    choices: ["opportunity gap", "empty road", "office desk"],
    answer: 0,
    takeaway: "opportunity gap",
    note: "“response to an opportunity gap” (phản ứng trước khoảng cách cơ hội) rất tự nhiên và sắc sảo.",
  },
  {
    id: "t2_cities_2",
    task: "task2",
    kind: "cloze",
    tag: "Từ vựng chính sách",
    exerciseId: "t2_cities",
    sentence: "Governments can offer ___ to firms that establish stable, skilled regional offices.",
    choices: ["tax incentives", "free holidays", "loud campaigns"],
    answer: 0,
    takeaway: "tax incentives",
    note: "Khi đề xuất giải pháp cấp chính phủ, “offer tax incentives” (ưu đãi thuế) là cụm ăn điểm kinh điển.",
  },
  {
    id: "t2_cities_order",
    task: "task2",
    kind: "order",
    tag: "Xếp mạch 4 đoạn",
    exerciseId: "t2_cities",
    instruction: "Sắp xếp 4 đoạn cho dạng Two-part Question (Nguyên nhân + Giải pháp):",
    steps: [
      {
        role: "Mở bài",
        text: "Young adults move to cities mainly for jobs and study; smaller towns can retain them only with real opportunities.",
      },
      {
        role: "Thân bài 1 (Trả lời câu hỏi 1 — Vì sao)",
        text: "Large cities concentrate universities, fast-growing employers, public transport and wider social networks.",
      },
      {
        role: "Thân bài 2 (Trả lời câu hỏi 2 — Giải pháp)",
        text: "Policies should narrow that gap through regional tax incentives, reliable broadband and local vocational links.",
      },
      {
        role: "Kết luận",
        text: "In conclusion, smaller towns need sustained investment rather than promotional campaigns alone.",
      },
    ],
    takeaway: "Answer Part 1 in Body 1, Part 2 in Body 2",
    note: "Dạng Two-part Question rõ ràng nhất khi mỗi đoạn thân bài giải quyết trọn vẹn 1 câu hỏi của đề.",
  },

  // --- Task 2: Household waste ---
  {
    id: "t2_waste_1",
    task: "task2",
    kind: "cloze",
    tag: "Collocation môi trường",
    exerciseId: "t2_waste",
    sentence: "A major cause of urban rubbish is the rapid growth of ___ from online deliveries.",
    choices: ["single-use packaging", "reusable containers", "public transport"],
    answer: 0,
    takeaway: "single-use packaging",
    note: "“single-use packaging” (bao bì dùng một lần) chuẩn xác tuyệt đối cho chủ đề rác thải đô thị.",
  },
  {
    id: "t2_waste_2",
    task: "task2",
    kind: "fix",
    tag: "Nâng từ Band 5 → Band 8",
    exerciseId: "t2_waste",
    sentence: "Reducing rubbish requires {{stopping waste early}} rather than relying on recycling alone.",
    choices: ["waste prevention at every stage", "stopping waste early", "throwing less stuff"],
    answer: 0,
    takeaway: "waste prevention",
    note: "Danh từ hoá thành “waste prevention at every stage” giúp câu kết luận đanh thép chuẩn Band 8.",
  },
  {
    id: "t2_waste_order",
    task: "task2",
    kind: "order",
    tag: "Xếp mạch 4 đoạn",
    exerciseId: "t2_waste",
    instruction: "Sắp xếp 4 đoạn cho bài Causes & Solutions (Rác thải sinh hoạt):",
    steps: [
      {
        role: "Mở bài",
        text: "Household waste keeps rising because systems favour disposal; both governments and individuals must act.",
      },
      {
        role: "Thân bài 1 (Nguyên nhân)",
        text: "A major cause is single-use packaging from deliveries alongside cheap goods that are costly to repair.",
      },
      {
        role: "Thân bài 2 (Giải pháp chính phủ)",
        text: "Governments can enforce producer responsibility, deposit-return schemes and reliable separate collection.",
      },
      {
        role: "Kết luận & vai trò cá nhân",
        text: "Individuals can choose durable goods and plan meals, making prevention effective at every stage.",
      },
    ],
    takeaway: "Causes → Systemic Policy → Individual Action",
    note: "Chia rõ Nguyên nhân → Chính sách vĩ mô → Hành động cá nhân giúp bài Causes & Solutions cực kỳ chặt chẽ.",
  },
];
