// Authentic IELTS Academic Reading True / False / Not Given challenges (24 items across 8 topics).
// Pure data module: zero React imports, 100% Node-testable.
import type { Difficulty } from "../typing-engine";

export type ReadingVerdict = "TRUE" | "FALSE" | "NOT_GIVEN";

export interface ReadingChallenge {
  id: string;
  topic: string;
  difficulty: Difficulty;
  passage: string;
  /** Exact substring inside `passage` highlighted after answering (proof for T/F, closest decoy for NG). */
  evidence: string;
  statement: string;
  answer: ReadingVerdict;
  trapType: string;
  explanation: string;
}

export const READING_CHALLENGES: ReadingChallenge[] = [
  // ---- EASY (8 items: 3 TRUE, 3 FALSE, 2 NOT_GIVEN) ----
  {
    id: "rd-e1",
    topic: "Đô thị",
    difficulty: "easy",
    passage:
      "In 2019, Oslo removed more than 700 street parking spaces in its central district and replaced them with cycle lanes, benches, and small parks. Within a year, pedestrian traffic in the city centre rose by roughly ten percent, while local retailers reported steady weekend sales.",
    evidence: "pedestrian traffic in the city centre rose by roughly ten percent",
    statement: "More people walked through central Oslo after the parking spaces were replaced.",
    answer: "TRUE",
    trapType: "Paraphrase đồng nghĩa",
    explanation:
      "\"Pedestrian traffic rose by roughly ten percent\" diễn đạt lại chính xác ý \"More people walked through central Oslo\".",
  },
  {
    id: "rd-e2",
    topic: "Môi trường",
    difficulty: "easy",
    passage:
      "Mangrove forests grow along tropical coastlines and protect inland towns from storm surges. Although they cover less than one percent of the world's tropical forest area, mangroves store up to four times more carbon per hectare than inland rainforests.",
    evidence: "mangroves store up to four times more carbon per hectare than inland rainforests",
    statement: "Inland rainforests hold more carbon per hectare than mangrove forests.",
    answer: "FALSE",
    trapType: "Đảo ngược so sánh",
    explanation:
      "Bài nói rừng ngập mặn (mangroves) lưu trữ carbon gấp tới 4 lần rừng mưa nội địa, nên mệnh đề nói ngược lại là FALSE.",
  },
  {
    id: "rd-e3",
    topic: "Lịch sử",
    difficulty: "easy",
    passage:
      "Paper was first documented in China during the Han Dynasty, traditionally credited to court official Cai Lun around 105 CE. Earlier Chinese scribes had written on bamboo strips and woven silk, which were either too heavy or too expensive for everyday correspondence.",
    evidence: "Earlier Chinese scribes had written on bamboo strips and woven silk",
    statement: "Cai Lun earned a large fortune by selling his new paper to merchants in Europe.",
    answer: "NOT_GIVEN",
    trapType: "Thông tin ngoài bài (Not Given)",
    explanation:
      "Đoạn văn chỉ nêu Cai Lun được ghi công tạo ra giấy năm 105 SCN, hoàn toàn không nhắc đến việc ông bán giấy sang châu Âu hay kiếm được gia tài.",
  },
  {
    id: "rd-e4",
    topic: "Tâm lý học",
    difficulty: "easy",
    passage:
      "Sleep researchers at a London clinic found that participants who took a 20-minute afternoon nap recalled newly learned vocabulary more accurately than those who stayed awake. However, naps lasting over an hour often caused temporary grogginess upon waking.",
    evidence: "participants who took a 20-minute afternoon nap recalled newly learned vocabulary more accurately",
    statement: "A short afternoon nap helped study participants remember new words better.",
    answer: "TRUE",
    trapType: "Paraphrase đồng nghĩa",
    explanation:
      "\"A 20-minute afternoon nap\" tương ứng \"short afternoon nap\" và \"recalled newly learned vocabulary more accurately\" khớp với \"remember new words better\".",
  },
  {
    id: "rd-e5",
    topic: "Sinh học biển",
    difficulty: "easy",
    passage:
      "Unlike most fish, the common octopus has three hearts and blue, copper-based blood. Two hearts pump blood through the gills, while the third circulates it to the rest of the body and actually stops beating when the octopus swims.",
    evidence: "the third circulates it to the rest of the body and actually stops beating when the octopus swims",
    statement: "All three of an octopus's hearts beat faster whenever it is swimming.",
    answer: "FALSE",
    trapType: "Bẫy định lượng (All) & trái nghĩa",
    explanation:
      "Trái tim thứ ba thực tế NGỪNG đập (stops beating) khi bạch tuộc bơi, trái ngược hoàn toàn với \"all three beat faster\".",
  },
  {
    id: "rd-e6",
    topic: "Giáo dục",
    difficulty: "easy",
    passage:
      "Primary schools in Finland postpone formal grading until students are at least ten years old. Teachers instead meet parents twice a year to discuss each child's curiosity, social skills, and reading habits.",
    evidence: "Primary schools in Finland postpone formal grading until students are at least ten years old",
    statement: "Finnish students receive higher university scholarships than students in neighbouring Sweden.",
    answer: "NOT_GIVEN",
    trapType: "So sánh không có trong bài",
    explanation:
      "Đoạn văn chỉ nói về việc bỏ chấm điểm sớm ở tiểu học Phần Lan, không hề so sánh học bổng đại học hay nhắc đến Thụy Điển.",
  },
  {
    id: "rd-e7",
    topic: "Công nghệ",
    difficulty: "easy",
    passage:
      "Early electric trams in the late nineteenth century required overhead copper wires to draw power continuously. While they reduced horse-drawn congestion, residents initially complained that the dense web of cables spoiled historic street views.",
    evidence: "residents initially complained that the dense web of cables spoiled historic street views",
    statement: "Some local people were unhappy with how the tram wires affected the look of old streets.",
    answer: "TRUE",
    trapType: "Paraphrase thái độ",
    explanation:
      "\"Residents initially complained\" = \"Some local people were unhappy\", và \"spoiled historic street views\" = \"affected the look of old streets\".",
  },
  {
    id: "rd-e8",
    topic: "Kinh tế",
    difficulty: "easy",
    passage:
      "When a software firm in Auckland trialled a four-day workweek with no reduction in pay, staff productivity remained unchanged and employee stress dropped noticeably. Management subsequently decided to adopt the schedule permanently.",
    evidence: "trialled a four-day workweek with no reduction in pay",
    statement: "Employees at the Auckland company had to accept lower salaries to work four days a week.",
    answer: "FALSE",
    trapType: "Phủ định trực tiếp",
    explanation:
      "Bài ghi rõ \"with no reduction in pay\" (không bị giảm lương), trái ngược với \"accept lower salaries\".",
  },

  // ---- NORMAL (8 items: 3 TRUE, 2 FALSE, 3 NOT_GIVEN) ----
  {
    id: "rd-n1",
    topic: "Môi trường",
    difficulty: "normal",
    passage:
      "Vertical farms grow leafy greens indoors under LED lights using up to ninety percent less water than open-field agriculture. Nevertheless, their heavy reliance on electricity makes staple crops such as wheat and rice economically impractical to cultivate indoors.",
    evidence: "their heavy reliance on electricity makes staple crops such as wheat and rice economically impractical",
    statement: "Growing rice inside vertical farms is currently too costly to be practical.",
    answer: "TRUE",
    trapType: "Paraphrase học thuật",
    explanation:
      "\"Economically impractical to cultivate indoors\" đồng nghĩa trực tiếp với \"too costly to be practical\".",
  },
  {
    id: "rd-n2",
    topic: "Lịch sử",
    difficulty: "normal",
    passage:
      "The Roman concrete used in harbour breakwaters has survived two millennia of crashing waves, whereas modern Portland cement begins to crack within decades. Chemists discovered that seawater reacts with volcanic ash in Roman mortar to form interlocking minerals that actually reinforce the structure over time.",
    evidence: "seawater reacts with volcanic ash in Roman mortar to form interlocking minerals that actually reinforce the structure",
    statement: "Exposure to seawater gradually weakens Roman harbour concrete.",
    answer: "FALSE",
    trapType: "Đảo ngược kết quả",
    explanation:
      "Nước biển phản ứng với tro núi lửa tạo khoáng chất GIA CỐ (reinforce) bê tông La Mã theo thời gian chứ không làm yếu đi (weakens).",
  },
  {
    id: "rd-n3",
    topic: "Tâm lý học",
    difficulty: "normal",
    passage:
      "People often assume that multitasking helps them finish office work more rapidly. In reality, switching attention between emails and spreadsheets incurs a cognitive cost known as 'switch lag', reducing overall accuracy even among experienced workers.",
    evidence: "switching attention between emails and spreadsheets incurs a cognitive cost known as 'switch lag'",
    statement: "Older office workers suffer from greater switch lag than younger colleagues.",
    answer: "NOT_GIVEN",
    trapType: "Bẫy suy diễn theo nhóm tuổi",
    explanation:
      "Bài chỉ nói switch lag xảy ra \"even among experienced workers\" (ngay cả người có kinh nghiệm), KHÔNG so sánh người lớn tuổi với người trẻ tuổi.",
  },
  {
    id: "rd-n4",
    topic: "Sinh học biển",
    difficulty: "normal",
    passage:
      "Humpback whales in the South Pacific compose complex songs that evolve each breeding season. Acoustic recordings show that new melodies originating off eastern Australia frequently spread eastward across thousands of kilometres until whales near French Polynesia adopt them.",
    evidence: "new melodies originating off eastern Australia frequently spread eastward across thousands of kilometres",
    statement: "Whale songs invented near eastern Australia can eventually be heard in French Polynesia.",
    answer: "TRUE",
    trapType: "Diễn giải địa lý",
    explanation:
      "Các giai điệu mới khởi nguồn ngoài khơi đông Úc lan về phía đông tới tận khi cá voi gần French Polynesia học theo -> TRUE.",
  },
  {
    id: "rd-n5",
    topic: "Đô thị",
    difficulty: "normal",
    passage:
      "Singapore requires developers of new high-rise buildings to replace any greenery cleared during construction with sky gardens, planted facades, or rooftop parks. As a result, several towers now feature more landscaped surface area than the plots of land they occupy.",
    evidence: "Singapore requires developers of new high-rise buildings to replace any greenery cleared during construction",
    statement: "Building rooftop gardens in Singapore is entirely voluntary for property developers.",
    answer: "FALSE",
    trapType: "Bẫy bắt buộc vs tự nguyện",
    explanation:
      "\"Singapore requires developers...\" (bắt buộc) mâu thuẫn trực tiếp với \"entirely voluntary\" (hoàn toàn tự nguyện).",
  },
  {
    id: "rd-n6",
    topic: "Công nghệ",
    difficulty: "normal",
    passage:
      "Autonomous delivery robots have operated on selected university campuses since 2018, navigating footpaths with cameras and ultrasonic sensors. Most campus operators limit their speed to a brisk walking pace so pedestrians can easily step around them.",
    evidence: "Most campus operators limit their speed to a brisk walking pace",
    statement: "Delivery robots have caused a noticeable fall in the number of bicycle commuters on campus.",
    answer: "NOT_GIVEN",
    trapType: "Thông tin không đề cập (Not Given)",
    explanation:
      "Đoạn văn chỉ nói robot đi trên lối đi bộ với tốc độ đi bộ nhanh, hoàn toàn không đề cập tới người đi xe đạp.",
  },
  {
    id: "rd-n7",
    topic: "Giáo dục",
    difficulty: "normal",
    passage:
      "Handwriting lecture notes is generally slower than typing on a laptop, which forces students to summarise ideas in their own words rather than transcribe sentences verbatim. Controlled trials suggest this active filtering strengthens long-term conceptual understanding.",
    evidence: "forces students to summarise ideas in their own words rather than transcribe sentences verbatim",
    statement: "Writing notes by hand encourages students to process ideas instead of copying every word.",
    answer: "TRUE",
    trapType: "Paraphrase học thuật",
    explanation:
      "\"Summarise ideas in their own words rather than transcribe verbatim\" khớp chính xác với \"process ideas instead of copying every word\".",
  },
  {
    id: "rd-n8",
    topic: "Kinh tế",
    difficulty: "normal",
    passage:
      "Community repair cafés invite residents to bring broken toasters, bicycles, and garments to be fixed free of charge by volunteer technicians. Organisers say the gatherings cut household waste while giving retired engineers a valued social role.",
    evidence: "Organisers say the gatherings cut household waste while giving retired engineers a valued social role",
    statement: "Most community repair cafés receive direct annual funding from municipal governments.",
    answer: "NOT_GIVEN",
    trapType: "Bẫy nguồn tài trợ ngoài bài",
    explanation:
      "Bài chỉ nhắc đồ được sửa miễn phí bởi tình nguyện viên, không hề đề cập đến việc có nhận ngân sách chính quyền hay không.",
  },

  // ---- HARD (8 items: 2 TRUE, 3 FALSE, 3 NOT_GIVEN) ----
  {
    id: "rd-h1",
    topic: "Tâm lý học",
    difficulty: "hard",
    passage:
      "Eyewitness testimony has historically carried great weight in courtrooms, yet cognitive studies demonstrate that memory does not operate like a video recording. Each time a witness recounts an event, subtle cues in a questioner's wording can unintentionally overwrite original details without the witness realising it.",
    evidence: "subtle cues in a questioner's wording can unintentionally overwrite original details without the witness realising it",
    statement: "Witnesses whose memories are altered by questioning are usually aware that their recall has changed.",
    answer: "FALSE",
    trapType: "Bẫy nhận thức (without realising)",
    explanation:
      "Bài nêu rõ chi tiết bị ghi đè \"without the witness realising it\" (nhân chứng KHÔNG nhận ra), trái ngược với \"usually aware\".",
  },
  {
    id: "rd-h2",
    topic: "Môi trường",
    difficulty: "hard",
    passage:
      "Reintroducing wolves to Yellowstone National Park in 1995 is widely credited with reducing elk grazing along riverbanks and allowing willow trees to rebound. More recent ecological reviews, however, argue that milder winters and rising beaver numbers played an equally decisive part in restoring those streams.",
    evidence: "milder winters and rising beaver numbers played an equally decisive part in restoring those streams",
    statement: "Some recent ecologists doubt that wolves were the sole reason Yellowstone's riverbanks recovered.",
    answer: "TRUE",
    trapType: "Bẫy từ khóa giới hạn (sole reason)",
    explanation:
      "Các đánh giá sinh thái mới cho rằng mùa đông ấm hơn và hải ly đóng vai trò ngang bằng -> nghĩa là họ nghi ngờ việc sói là nguyên nhân DUY NHẤT (sole reason).",
  },
  {
    id: "rd-h3",
    topic: "Lịch sử",
    difficulty: "hard",
    passage:
      "Until the eighteenth century, mariners could determine latitude from the sun and stars but struggled to calculate longitude accurately at sea. Although astronomers favoured lunar-distance tables, it was Yorkshire carpenter John Harrison's marine chronometer that ultimately proved most practical for everyday navigation.",
    evidence: "it was Yorkshire carpenter John Harrison's marine chronometer that ultimately proved most practical",
    statement: "John Harrison collaborated closely with royal astronomers to refine his marine chronometer.",
    answer: "NOT_GIVEN",
    trapType: "Bẫy quan hệ nhân vật (Not Given)",
    explanation:
      "Bài chỉ nói các nhà thiên văn chuộng bảng khoảng cách mặt trăng còn Harrison chế tạo đồng hồ hàng hải — KHÔNG nói họ có hợp tác với nhau hay không.",
  },
  {
    id: "rd-h4",
    topic: "Công nghệ",
    difficulty: "hard",
    passage:
      "Large language models can generate fluent legal summaries in seconds, prompting predictions of mass layoffs among junior lawyers. Yet surveys of European law firms indicate that while routine drafting hours have fallen, firms have redirected graduates toward client advisory work rather than cutting entry-level hiring.",
    evidence: "firms have redirected graduates toward client advisory work rather than cutting entry-level hiring",
    statement: "European law firms surveyed have sharply reduced the number of junior lawyers they recruit.",
    answer: "FALSE",
    trapType: "Bẫy dự đoán vs thực tế",
    explanation:
      "Giảm nhân sự chỉ là *dự đoán* (predictions); thực tế các hãng luật châu Âu chuyển hướng việc làm cho sinh viên mới ra trường \"rather than cutting entry-level hiring\" -> FALSE.",
  },
  {
    id: "rd-h5",
    topic: "Sinh học biển",
    difficulty: "hard",
    passage:
      "Deep-sea hydrothermal vents support thriving ecosystems without sunlight, relying on bacteria that convert hydrogen sulphide into organic nutrients. Because these vents are ephemeral and often collapse within decades, vent species depend on drifting larvae to colonise newly formed chimneys hundreds of kilometres away.",
    evidence: "vent species depend on drifting larvae to colonise newly formed chimneys hundreds of kilometres away",
    statement: "Hydrothermal vent organisms can only survive because their habitats remain stable for centuries.",
    answer: "FALSE",
    trapType: "Bẫy từ vựng học thuật (ephemeral)",
    explanation:
      "\"Ephemeral\" nghĩa là ngắn ngủi, thường sụp đổ trong vài thập kỷ (collapse within decades) — trái ngược hoàn toàn với \"remain stable for centuries\".",
  },
  {
    id: "rd-h6",
    topic: "Kinh tế",
    difficulty: "hard",
    passage:
      "When congestion charges were introduced in central Stockholm, initial public opposition exceeded seventy percent in opinion polls. Once commuters experienced shorter bus journeys and clearer air during the seven-month trial, a narrow majority voted in a referendum to keep the charge permanently.",
    evidence: "Once commuters experienced shorter bus journeys and clearer air during the seven-month trial, a narrow majority voted in a referendum to keep the charge",
    statement: "Public attitudes toward Stockholm's congestion charge shifted after residents saw its effects firsthand.",
    answer: "TRUE",
    trapType: "Paraphrase tiến trình thay đổi",
    explanation:
      "Ban đầu hơn 70% phản đối, nhưng sau khi trải nghiệm trực tiếp giai đoạn thử nghiệm 7 tháng thì đa số hẹp bỏ phiếu giữ lại -> thái độ công chúng đã thay đổi -> TRUE.",
  },
  {
    id: "rd-h7",
    topic: "Giáo dục",
    difficulty: "hard",
    passage:
      "Bilingual children sometimes display a slightly smaller vocabulary in each individual language at age four than monolingual peers. When words known across both languages are combined, however, their total conceptual vocabulary is typically comparable, and the single-language gap disappears by mid-primary school.",
    evidence: "their total conceptual vocabulary is typically comparable, and the single-language gap disappears by mid-primary school",
    statement: "Bilingual children consistently outperform monolingual children in secondary-school mathematics.",
    answer: "NOT_GIVEN",
    trapType: "Mở rộng phạm vi ngoài bài",
    explanation:
      "Đoạn văn chỉ bàn về vốn từ vựng đến giữa cấp tiểu học, hoàn toàn không nhắc đến môn Toán hay bậc trung học.",
  },
  {
    id: "rd-h8",
    topic: "Đô thị",
    difficulty: "hard",
    passage:
      "Widening urban motorways is frequently proposed to relieve chronic traffic jams, yet transport economists have observed a counterintuitive pattern called 'induced demand'. Extra lanes temporarily speed up commutes, which encourages suburban expansion and more car trips until congestion returns to its former level.",
    evidence: "encourages suburban expansion and more car trips until congestion returns to its former level",
    statement: "Expanding rail networks is a cheaper long-term solution to traffic jams than widening motorways.",
    answer: "NOT_GIVEN",
    trapType: "So sánh giải pháp không có trong bài",
    explanation:
      "Bài chỉ giải thích hiện tượng \"induced demand\" khi mở rộng đường cao tốc, hoàn toàn không nhắc đến đường sắt (rail networks) hay chi phí của nó.",
  },
];
