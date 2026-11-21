# Party Mode (Battle Royale) cho Keep Me Away From IELTS: Thiết kế

- Ngày: 2026-11-21
- Trạng thái: chờ duyệt
- Repo: `keep_me_away_from_ielts` (Next.js 16.4, React 19, Tailwind 4, Docker standalone)

## 1. Mục đích và lý do

Chủ repo đang ở DevFest Ho Chi Minh City 2026 và muốn một game cho **người tham dự chơi thử tại booth**.
Thay vì làm game mới, ta thêm **chế độ nhiều người** vào game có sẵn *Keep Me Away From IELTS*:
từ IELTS rơi xuống, phải gõ kịp trước khi chạm đất, để rơi 5 từ là thua, cứ 5 map có boss.

Ý tưởng: cả đám đông quét QR trên màn hình lớn, cùng chơi một vòng trên điện thoại.
Ai để rơi đủ 5 từ thì bị loại, người trụ lại cuối cùng thắng. Màn hình lớn cho cả booth xem
ai còn sống. Gemini thêm hai điểm nhấn: khán giả chọn chủ đề cho vòng chơi, và cuối vòng
có "phiếu chấm band" vui cho người thắng.

Chủ repo muốn **cả hệ thống chạy trên Google Cloud** (Cloud Run + Vertex AI + Firebase) để
khoe được ở DevFest.

## 2. Mục tiêu, không làm, và thế nào là thất bại

**Mục tiêu**
- 2–30 người cùng chơi một vòng trên điện thoại, vào phòng bằng cách quét QR, không cần cài app hay đăng nhập.
- Màn hình lớn (laptop + TV/máy chiếu ở booth) điều khiển phòng: hiện QR, bắt đầu vòng, hiện ai còn sống, công bố người thắng.
- Mọi người trong cùng vòng nhận **cùng thứ tự từ** (công bằng, có cảm giác "cùng chơi").
- Gemini (qua Vertex AI) chọn từ theo chủ đề khán giả hô, và viết phiếu chấm band cuối vòng.
- Toàn bộ app chạy trên Cloud Run, trong cùng một project Google Cloud với Firebase.

**Không làm**
- Tài khoản, đăng nhập thật, bảng xếp hạng toàn cầu lưu lâu dài.
- Chống gian lận (người chơi tự gửi điểm của mình; đây là game booth).
- App native, giọng nói, nhiều phòng quy mô lớn (hỗ trợ nhiều phòng nhưng không tối ưu cho việc đó).
- Đổi hành vi của chế độ chơi đơn hiện tại.

**Thất bại nếu** (dù về kỹ thuật vẫn "chạy được)
- Chế độ chơi đơn ở `/` bị hỏng hoặc thay đổi.
- Gõ trên điện thoại bị lag vì phải chờ mạng: việc gõ và từ rơi phải chạy hoàn toàn trên máy người chơi.
- Gemini chậm hoặc lỗi làm booth bị đứng: mọi chỗ gọi Gemini phải có phương án dự phòng.
- Người lạ gọi được API Gemini và tiêu tiền của chủ repo.

## 3. Ràng buộc

- **Credits**: chỉ có "GDP - Codelab credit" 5 USD trên billing account
  *GDP Event Credit: Road to DevFest Ho Chi Minh City 2026*, **hết hạn ngày 21/11/2026**.
  Sau đó project phải gắn billing account thật (chủ repo có sẵn billing account "Firebase Payment").
  Thiết kế không được phụ thuộc vào số credits này; phải đặt budget alert.
- **Next.js 16.4 khác bản quen thuộc**: `AGENTS.md` yêu cầu đọc tài liệu trong
  `node_modules/next/dist/docs/` trước khi viết code. Config đang bật `cacheComponents` và `partialPrefetching`.
- **Engine hiện tại** (`app/game/engine.ts`) là reducer thuần: mọi số ngẫu nhiên đi vào qua action `tick`
  (`RANDS_PER_TICK = 11` số mỗi tick, do `TypingGame.tsx` tạo bằng `Math.random()` mỗi frame).
  Số tick khác nhau giữa các máy (60Hz và 120Hz), nên chỉ dùng chung seed thì chưa đủ để ra cùng thứ tự từ.
- **Dữ liệu từ** nằm sẵn trong bundle phía client: `data/words.json` (5.785 từ, xếp theo tần suất, có nghĩa tiếng Việt)
  và `data/phrases.json` (307 cụm).
- **CI** (`.github/workflows/docker.yml`) đang lint + type-check rồi build image đẩy lên Docker Hub.
  Push lên `main` sẽ kích hoạt build.
- **Demo diễn ra hôm nay (21/11/2026), chỉ còn vài giờ.** Phạm vi được cắt theo mục 3.1.

### 3.1 Phạm vi cho buổi demo hôm nay

Thứ tự ưu tiên chủ repo đã đồng ý: phần chơi nhiều người và Cloud Run luôn giữ; nếu thiếu giờ thì cắt
chọn từ theo chủ đề trước, sau đó mới đến phiếu chấm band.

- **Làm hôm nay**: sảnh chờ + QR, đếm ngược, battle royale, màn hình lớn, kết quả + phiếu chấm band của Gemini
  (Vertex AI), deploy lên Cloud Run, Firebase Realtime Database + Anonymous Auth, PIN host, công tắc tắt/bật.
- **Hoãn lại sau buổi demo**: chọn từ theo chủ đề (mục 5.6a), nút loại người chơi, CI tự deploy lên Cloud Run,
  bộ test cho engine. Vòng party hôm nay dùng kho N từ phổ biến nhất theo độ khó.
- **Ai làm phần Google Cloud**: Claude làm qua Chrome đang đăng nhập của chủ repo: tạo project mới, bật
  Cloud Run, Vertex AI, Firebase (Realtime Database, Anonymous Auth), lấy Firebase web config, deploy.
  Mọi bước động đến billing (gắn billing account, đổi billing) đều hỏi chủ repo trước khi bấm.
- **Deploy hôm nay**: máy chủ repo chưa cài `gcloud` và Firebase CLI, nên deploy bằng **Cloud Shell** trong
  trình duyệt (`git clone` repo rồi `gcloud run deploy --source .`), không đi qua CI. Firebase rules cũng dán
  qua Firebase Console.
- Kiểm tra trước giờ demo: ít nhất 2 điện thoại thật + màn hình lớn, chơi trọn một vòng trên URL Cloud Run.

## 4. Các cách đã cân nhắc

| Cách | Mô tả | Đánh đổi |
|------|-------|----------|
| **#1 Battle royale đồng bộ** (đã chọn) | Mỗi điện thoại tự chạy engine có sẵn với cùng một chuỗi từ; chỉ gửi điểm và mạng lên. Màn hình lớn hiện ai còn sống. | Dùng lại gần như toàn bộ engine; mạng chậm không làm lag phần gõ. Không có tương tác trực tiếp giữa người chơi (ai cũng chơi màn của mình). |
| #2 Giành từ trên một làn chung | Cả phòng nhìn một làn trên màn hình lớn, ai gõ đúng trước thì được từ. | Hỗn loạn và vui nhất, nhưng phải dời engine lên server, cần server phân xử ai gõ trước, wifi hội trường chậm là hỏng. |
| #3 Đấu tay đôi tại máy booth | Hai bàn phím, màn hình chia đôi, không cần mạng. | Nhanh và chắc nhất, nhưng mỗi lượt chỉ 2 người, mất cảnh đám đông quét QR. |

Chủ repo chọn **#1**. Về hạ tầng, chủ repo chọn **đưa hết lên Google Cloud** thay vì giữ server hiện tại
và dùng Gemini API key từ AI Studio.

## 5. Thiết kế đã chốt

### 5.1 Đường dẫn

- `/` giữ nguyên: chế độ chơi đơn.
- `/party/host`: màn hình lớn. Phải nhập **mã PIN host** (biến môi trường `PARTY_HOST_PIN`) mới tạo được phòng.
- `/party?room=ABCD`: trang người chơi. QR trên màn hình lớn trỏ tới đây.
  URL trong QR lấy theo domain app đang chạy, nên không phụ thuộc vào domain.
- **Công tắc tắt/bật**: `/party`, `/party/host` và các route `/api/party/*` chỉ hoạt động khi server có
  `PARTY_HOST_PIN`. Thiếu biến này thì trang báo "Party mode chưa bật" và API trả 404. Nhờ vậy, nếu server cũ
  ở `keepmeawayfromielts.vnftgroup.com` tự kéo image `latest` từ Docker Hub thì party vẫn tắt ở đó, và code
  party có thể merge vào `main` an toàn.

### 5.2 Luồng một vòng chơi

1. **Sảnh chờ**: host tạo phòng, nhận mã 4 chữ cái. Màn hình lớn hiện QR, mã phòng và tên người đã vào.
   Người chơi quét QR, nhập tên (tối đa 16 ký tự) rồi vào sảnh chờ.
2. **Cài đặt vòng** (trên màn hình lớn): chế độ (Từ đơn / Cụm từ), độ khó (mặc định **Dễ**, vì gõ
   trên điện thoại chậm hơn bàn phím), và chủ đề tuỳ chọn (gõ tay hoặc bấm chủ đề gợi ý:
   Environment, Technology, Education, Health, Travel, Work...).
3. **Đếm ngược**: host bấm Bắt đầu. Server đặt thời điểm bắt đầu = giờ server + 5 giây.
   Mọi máy đếm ngược 3-2-1 theo giờ server rồi cùng bắt đầu.
4. **Chơi**: mỗi máy chạy engine cục bộ, gửi điểm, số mạng, map và trạng thái sống/chết lên Firebase.
   Màn hình lớn hiện lưới người chơi: tên, điểm, tim còn lại; người bị loại bị làm mờ;
   dòng lớn "Còn 9/15 người".
5. **Kết thúc** khi một trong các điều sau xảy ra:
   - chỉ còn ≤ 1 người sống (nếu vòng bắt đầu với ≥ 2 người);
   - hết **3 phút**, để hàng chờ ở booth không bị ùn;
   - tất cả đều bị loại.

   Người thắng là người sống sót cuối cùng. Nếu hết giờ hoặc nhiều người bị loại cùng lúc,
   ai điểm cao hơn thắng.
6. **Kết quả**: màn hình lớn hiện top 3 và phiếu chấm band của Gemini. Điện thoại hiện hạng và chỉ số của mình.
   Host bấm "Vòng mới" thì mọi người quay về sảnh chờ (không cần quét lại QR).

Người vào phòng khi vòng đang chạy thì chờ vòng sau. Host có nút loại một người ra khỏi phòng
(phòng khi có tên không phù hợp hiện lên màn hình lớn).

### 5.3 Phác thảo màn hình

Màn hình lớn, lúc đang chơi:
```
┌──────────────────────────────────────────────────────────┐
│ KEEP ME AWAY FROM IELTS · PARTY       Phòng ABCD   2:14 ⏱ │
│ Chủ đề: Environment · Dễ · Từ đơn                         │
│                   CÒN 9 / 15 NGƯỜI                        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ Minh     │ │ Lan      │ │ Huy      │ │ ░Tú░     │       │
│ │ 1.240    │ │ 980      │ │ 860      │ │ ░loại░   │       │
│ │ ♥♥♥♥♡    │ │ ♥♥♡♡♡    │ │ ♥♥♥♥♥    │ │          │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘  ...  │
│              [QR nhỏ góc phải: vào xem/chờ vòng sau]       │
└──────────────────────────────────────────────────────────┘
```

Điện thoại, lúc đang chơi: dùng lại làn chơi và ô gõ của `TypingGame`. HUD hiện điểm, tim,
"Còn 9/15", và đồng hồ vòng. Không có nút Tạm dừng, không có "Chơi tiếp" khi thua.
Ô gõ đã có sẵn `autoCorrect/autoCapitalize/spellCheck` tắt; cần kiểm tra lại bố cục khi bàn phím
điện thoại che nửa màn hình.

Điện thoại, khi bị loại: "Bạn hạng 7/15 · 860 điểm", danh sách từ đã để rơi kèm nghĩa,
và dòng trực tiếp "Còn 4 người...".

### 5.4 Luật khác với chơi đơn

- Không tạm dừng, không "Chơi tiếp" (hồi sinh) sau khi thua.
- **Kho từ cố định trong cả vòng.** Chơi đơn thì kho từ mở rộng theo map; party thì không.
  Kho từ là danh sách theo chủ đề (nếu có), hoặc N từ phổ biến nhất theo độ khó
  (lấy theo `DIFFICULTIES[d][mode].start`).
- **Cùng thứ tự từ**: từ xuất hiện thứ *n* phải giống nhau trên mọi máy. Lựa chọn từ
  (pick/repick) và từ của boss lấy từ một bộ sinh số ngẫu nhiên có seed, đánh số theo
  thứ tự xuất hiện (seed của vòng + n), không theo số tick. Các giá trị khác (vị trí x, tốc độ,
  tim) vẫn có thể khác nhau giữa các máy. Tốc độ rơi vẫn tăng theo map như chơi đơn.
- Chơi đơn phải giữ nguyên hành vi: thay đổi trong engine chỉ có hiệu lực khi ở chế độ party.

### 5.5 Đồng bộ phòng: Firebase Realtime Database

Dùng Firebase Realtime Database, nằm cùng project Google Cloud với Cloud Run. Người chơi đăng nhập
bằng **Firebase Anonymous Auth** (ẩn với người dùng) để security rules biết ai được ghi vào đâu.

Mô hình dữ liệu (gợi ý; tên trường do người build quyết):
```
rooms/{code}
  hostUid, createdAt, round
  status: "lobby" | "countdown" | "playing" | "ended"
  settings: { mode, difficulty, topic?, pool?: number[] }   // pool = chỉ số trong words/phrases.json
  seed, startAt, endsAt                                     // giờ server, ms
  players/{uid}: { name, joinedAt, connected, alive, score, lives, map, cleared, eliminatedAt, missed[] }
  results: { winnerUid, ranking[], cards[] }
```

- **Rules**: người chơi chỉ ghi được vào `players/{uid của mình}`; chỉ `hostUid` ghi được các trường cấp phòng.
- Danh sách từ theo chủ đề gửi xuống dưới dạng **chỉ số** trong file dữ liệu sẵn có, không gửi cả chữ.
- Máy người chơi gửi trạng thái tối đa khoảng 2 lần/giây. Mất mạng hoặc bị loại thì gửi ngay.
  Dùng `onDisconnect` để đánh dấu mất kết nối.
- Đồng bộ đồng hồ bằng `.info/serverTimeOffset`.
- Theo mình nhớ, gói Firebase miễn phí giới hạn khoảng 100 kết nối đồng thời, đủ cho một booth (người build kiểm tra lại).

Firebase web config không phải bí mật, có thể commit thẳng trong code.

### 5.6 Gemini qua Vertex AI

Gọi từ **route handler phía server** của Next.js, dùng `@google/genai` ở chế độ Vertex AI.
Trên Cloud Run, xác thực bằng service account của service (không có API key nào).
Chạy local thì dùng `gcloud auth application-default login`.
Model mặc định là bản Gemini Flash hiện hành, đổi được qua biến môi trường `GEMINI_MODEL`.
Mọi route Gemini yêu cầu PIN host (hoặc token phiên host suy ra từ PIN), để người lạ không gọi được.

**a) Chọn từ theo chủ đề** (`POST /api/party/topic`), **chỉ cho chế độ Từ đơn**. *Hoãn lại sau buổi demo (mục 3.1).*
- Chế độ Cụm từ không có ô chủ đề: `phrases.json` chỉ có 307 cụm chung chung, chủ đề "Environment" ở độ khó Dễ
  chỉ khớp khoảng 3 cụm (Vừa/Khó khoảng 15), không đủ cho một vòng. Từ đơn thì đủ: riêng Dễ có 3.286 từ,
  "Environment" khớp khoảng 37+ từ.
- Gửi chủ đề và độ khó. Yêu cầu Gemini trả về khoảng 150 từ/cụm tiếng Anh liên quan chặt tới chủ đề (JSON).
- Server **chỉ giữ những mục có trong kho dữ liệu** (sau khi lọc độ dài theo độ khó), lấy nghĩa tiếng Việt
  từ kho, trả về danh sách chỉ số.
- Nếu ít hơn 30 mục khớp: bù bằng từ phổ biến và báo cho host. Quá 8 giây hoặc lỗi: dùng kho mặc định.

**b) Phiếu chấm band** (`POST /api/party/report`)
- Một lần gọi mỗi vòng, cho top 3: tên, điểm, map, độ chính xác, WPM, tối đa 5 từ để rơi.
- Trả về JSON `{ uid, band, comment }` bằng tiếng Việt: band kiểu "6.5",
  nhận xét 1–2 câu, hài hước nhưng tử tế, không chê bai người chơi.
- Tên người chơi do người dùng nhập: cắt độ dài và coi là dữ liệu, không phải chỉ thị.
- Lỗi hoặc quá thời gian: dùng phiếu theo mẫu soạn sẵn.

### 5.7 Hạ tầng Google Cloud

- **Cloud Run**: deploy đúng Docker image hiện có (standalone server, cổng 3000), region `asia-southeast1`.
  Server không giữ trạng thái (mọi trạng thái phòng nằm ở Firebase) nên Cloud Run thoải mái tăng giảm instance.
- **Vertex AI API** bật trong cùng project. Service account của Cloud Run có quyền gọi Vertex AI.
- **Firebase**: thêm Firebase vào chính project đó, bật Realtime Database và Anonymous Auth.
- **Biến môi trường trên Cloud Run** (Cloud Run → service → Edit & deploy new revision → Variables & secrets):

  | Biến | Giá trị | Bí mật? |
  |------|---------|---------|
  | `PARTY_HOST_PIN` | chủ repo tự đặt; thiếu thì party tắt | có |
  | `GOOGLE_GENAI_USE_VERTEXAI` | `true` | không |
  | `GOOGLE_CLOUD_PROJECT` | project ID của project mới | không |
  | `GOOGLE_CLOUD_LOCATION` | region Vertex AI có model Flash (ví dụ `global` hoặc `asia-southeast1`) | không |
  | `GEMINI_MODEL` | tuỳ chọn, ghi đè model mặc định | không |

  Firebase web config **không** đi qua biến môi trường: `NEXT_PUBLIC_*` bị đóng cứng lúc build, nên config
  được commit thẳng vào code (nó không phải bí mật).
- **Billing**: hôm nay project dùng billing account có credits. Sau 21/11, chủ repo gắn billing account
  thật và đặt budget alert (ví dụ 5 USD/tháng).
- Server hiện tại ở `keepmeawayfromielts.vnftgroup.com` giữ nguyên. App trên Cloud Run dùng URL `*.run.app`.
  Trỏ domain riêng sang Cloud Run là việc tuỳ chọn về sau (cần chủ repo đổi DNS).

## 6. Các quyết định Claude tự đưa ra (để chủ repo kiểm tra)

- Firebase Realtime Database + Anonymous Auth cho đồng bộ phòng (thay vì Firestore hay WebSocket tự viết).
- Vertex AI + service account trên Cloud Run, model Flash đổi được qua biến môi trường.
- Mã PIN host bảo vệ việc tạo phòng và các route Gemini.
- Vòng tối đa 3 phút; độ khó mặc định Dễ; tối đa 30 người mỗi phòng.
- Kho từ cố định trong vòng party; "cùng thứ tự từ" theo thứ tự xuất hiện.
- Không tạm dừng, không hồi sinh trong party.
- Gemini chấm band cho top 3 trong một lần gọi (không chấm cho từng người).
- Region `asia-southeast1`; giữ server cũ, app Cloud Run dùng URL `*.run.app` lúc đầu.
- Giao diện tiếng Việt, cùng phong cách với game hiện tại.
- Chủ đề Gemini chỉ áp dụng cho chế độ Từ đơn (Cụm từ không đủ dữ liệu theo chủ đề).
- Party chỉ bật khi có `PARTY_HOST_PIN`, nên merge vào `main` không làm lộ party trên server cũ.

## 7. Để lại cho người build

- Thư viện vẽ QR, bộ sinh số ngẫu nhiên có seed, cách sinh mã phòng.
- Bố cục chi tiết của màn hình lớn và màn hình điện thoại (theo phác thảo ở 5.3 và phong cách hiện có).
- Tần suất gửi trạng thái, cách xử lý mất kết nối giữa vòng, dọn phòng cũ.
- Cách tách engine để chế độ party không làm đổi hành vi chơi đơn.
- Cách deploy lên Cloud Run (`gcloud run deploy --source`, Artifact Registry, hay lấy image từ Docker Hub)
  và có nối vào CI hay không.
- Có thêm bộ test cho engine hay không (repo hiện chưa có test; CI chạy lint + `tsc`).
