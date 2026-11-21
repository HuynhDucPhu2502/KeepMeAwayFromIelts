# Party Mode (Battle Royale) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a phone-based battle-royale party mode with a big-screen host view to Keep Me Away From IELTS, running on Cloud Run + Firebase RTDB + Vertex AI, ready for a booth demo today.

**Architecture:** Each phone runs the existing deterministic reducer locally; party mode adds a seeded word stream and a fixed pool so word *n* is the same on every phone. Room state lives in Firebase Realtime Database (anonymous auth, host-owned room node, player-owned child nodes). A server route on the Next.js standalone server calls Gemini through Vertex AI for the end-of-round band cards, with a template fallback.

**Tech Stack:** Next.js 16.4 (App Router, `output: "standalone"`, `cacheComponents`), React 19, Tailwind 4 + `app/globals.css`, `firebase` (web SDK), `@google/genai` (Vertex mode), `qrcode`, Node 26 built-in `node:test` with native TS type stripping (no test framework added).

**Spec:** `docs/superpowers/specs/2026-11-21-party-mode-design.md`

## Global Constraints

- Solo mode at `/` must behave exactly as before; party changes in the engine only apply when `state.party` is set.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md).
- Party is enabled only when `PARTY_HOST_PIN` is set on the server; otherwise pages say "Party mode chưa bật" and `/api/party/*` returns 404.
- Round cap 3 minutes (`ROUND_MS = 180_000`), countdown 5 s, default difficulty `easy`, max 30 players, name ≤ 16 chars.
- No pause, no continue in party. Fixed pool = first `DIFFICULTIES[d][mode].start` entries of `buildPool(...)`.
- Gemini band cards: one call per round for top 3, Vietnamese, `{ uid, band, comment }`, timeout 10 s, template fallback.
- Env on Cloud Run: `PARTY_HOST_PIN` (entered by the owner, never by Claude), `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, optional `GEMINI_MODEL`.
- Firebase web config is committed in code (not env). Topic picker is out of scope today.
- UI copy in Vietnamese, same visual style as the solo game.

## Review Focus

- A phone locks/backgrounds mid-round → it must not freeze others; host treats a player with `connected: false` for > 10 s as eliminated.
- Two last survivors die in the same publish window → winner is the higher score (ranking: alive first, then score desc, then eliminatedAt desc).
- A player opens `/party?room=XXXX` for a room that does not exist or is mid-round → clear message, no crash; mid-round joiners wait for the next round.
- Gemini route slow/failing or Vertex not configured → host still shows template cards within ~10 s.
- Phone soft keyboard covers half the screen → lane and input stay usable (check at 375×667 with keyboard space reserved).

---

### Task 1: Engine party support + shared Lane component

**Files:**
- Modify: `app/game/engine.ts` (state, `start` action, `spawn`, `bossWord`, `activePool`, `pause`/`continue` guards)
- Create: `app/game/Lane.tsx` (move `TypedText`, `FallingWord`, `BossView`, popups, banner, ground out of `TypingGame.tsx`)
- Modify: `app/game/TypingGame.tsx` (render `<Lane>`; no behavior change)
- Test: `tests/engine-party.test.mjs`
- Modify: `package.json` (`"test": "node --test tests/"`)

**Interfaces — Produces:**
- `export function seededRandom(seed: number, n: number): number` → `[0, 1)`, pure.
- `GameState.party: { seed: number } | null`, `GameState.spawned: number`, `GameState.bossPicks: number`.
- `Action` `start` gains optional `party?: { seed: number }`.
- `export function partyPool(mode: Mode, difficulty: Difficulty, words: Entry[], phrases: Entry[]): Entry[]`.
- `export function Lane(props: { state: GameState; showMeaning: boolean }): JSX.Element` in `app/game/Lane.tsx`.

- [ ] Step 1: Write failing tests in `tests/engine-party.test.mjs` (import `../app/game/engine.ts`):
  - `same seed → same first 15 spawned texts` across two runs ticked with different dt sequences (1/60 vs 1/120) and different non-pick randoms.
  - `party: pause is ignored` and `party: continue is ignored after over`.
  - `party: pool does not grow with map` (state.map = 4 → candidates only from the fixed pool).
  - `solo unchanged: start without party gives party === null and pick uses rand[0]`.
- [ ] Step 2: `npm test` → FAIL (seededRandom not exported).
- [ ] Step 3: Implement: `spawn` uses `seededRandom(seed, spawned*2)` / `+1` for pick/repick when `state.party`; `bossWord` uses `seededRandom(seed, 1_000_000 + bossPicks)`; `activePool` returns whole pool when party; reducer ignores `pause`/`continue` when party.
- [ ] Step 4: `npm test` → PASS; `npm run lint && npx tsc --noEmit` → clean.
- [ ] Step 5: Extract `Lane.tsx`, swap into `TypingGame.tsx`; run dev server, play solo one map → identical look.
- [ ] Step 6: Commit `feat(engine): seeded party word stream and shared Lane`.

### Task 2: Firebase client + room module + rules

**Files:**
- Create: `app/party/firebase.ts`, `app/party/room.ts`, `database.rules.json`
- Modify: `package.json` (dep `firebase`)

**Interfaces — Produces (all in `app/party/room.ts`):**
- Types: `RoomStatus = "lobby" | "playing" | "ended"`; `RoomSettings { mode: Mode; difficulty: Difficulty }`; `PlayerState { name; joinedAt; connected; round; alive; score; lives; map; cleared; accuracy; wpm; eliminatedAt: number | null; missed: string[] }`; `Room { hostUid; createdAt; round; status; settings; seed; startAt; endsAt; players: Record<string, PlayerState>; results?: RoundResults }`; `RoundResults { ranking: string[]; cards: BandCard[]; fallback: boolean }`; `BandCard { uid; band; comment }`.
- `ensureSignedIn(): Promise<string>` (firebase.ts), `serverNow(): number` (uses `.info/serverTimeOffset`).
- `createRoom(hostUid: string): Promise<string>` (4 letters A–Z minus I/O, retry if taken)
- `joinRoom(code: string, uid: string, name: string): Promise<"ok" | "missing" | "full">` (sets `onDisconnect` → `connected: false`)
- `subscribeRoom(code: string, cb: (room: Room | null) => void): () => void`
- `startRound(code: string, room: Room, settings: RoomSettings): Promise<void>` (round+1, new seed, `startAt = serverNow()+5000`, `endsAt = startAt + ROUND_MS`, status `playing`)
- `publishPlayer(code: string, uid: string, patch: Partial<PlayerState>): Promise<void>`
- `endRound(code: string, results: RoundResults): Promise<void>`, `backToLobby(code: string): Promise<void>`
- `participants(room: Room): [string, PlayerState][]` (players with `round === room.round`), `rankPlayers(room: Room, now: number): string[]` (alive & connected-recently first, then score desc, then eliminatedAt desc), `shouldEnd(room: Room, now: number): boolean` (≥2 participants and ≤1 alive; or all out; or `now >= endsAt`).
- Rules: room readable by any signed-in user; room node creatable if `hostUid === auth.uid`, writable only by host; `players/$uid` writable by that uid, name string ≤ 16.

- [ ] Step 1: Failing tests in `tests/room-logic.test.mjs` for `rankPlayers` and `shouldEnd` (put them in `app/party/room-logic.ts`, no Firebase import): last-two-same-tick → higher score wins; 1-player round ends only when that player is out; time cap ends round.
- [ ] Step 2: `npm test` → FAIL. Step 3: implement `room-logic.ts`. Step 4: PASS.
- [ ] Step 5: Implement `firebase.ts` + `room.ts` against the real project config (from Task 6 setup).
- [ ] Step 6: Commit `feat(party): firebase room sync and rules`.

### Task 3: Host routes + Gemini band cards

**Files:**
- Create: `app/api/party/host/route.ts` (GET → `{ enabled }`; POST `{ pin }` → `{ ok }` / 401; 404 when disabled)
- Create: `app/api/party/report/route.ts` (POST `{ pin, players: ReportPlayer[] }` → `{ cards: BandCard[], fallback: boolean }`)
- Create: `app/party/report-core.ts` (pure: `buildReportPrompt(players: ReportPlayer[]): string`, `parseCards(text: string, players: ReportPlayer[]): BandCard[] | null`, `fallbackCards(players: ReportPlayer[]): BandCard[]`)
- Test: `tests/report-core.test.mjs`
- Modify: `package.json` (dep `@google/genai`)

`ReportPlayer { uid; name (≤16); score; map; accuracy; wpm; missed: string[] (≤5) }`. Band strings in `["5.0".."9.0"]` step 0.5. Prompt asks JSON array, Vietnamese, 1–2 kind funny sentences, treats names as data. Model `process.env.GEMINI_MODEL ?? <current Flash id on Vertex>`.

- [ ] Step 1: Failing tests: `parseCards` accepts fenced JSON, rejects unknown uid / missing fields (→ null); `fallbackCards` returns one card per player with a valid band.
- [ ] Step 2: FAIL → Step 3 implement → Step 4 PASS.
- [ ] Step 5: Implement routes; PIN compare with `crypto.timingSafeEqual`; 10 s `AbortSignal.timeout`; any error → `fallbackCards`.
- [ ] Step 6: `curl` local: GET host → `{enabled:true}` with `.env.local`; POST report with wrong pin → 401; right pin without ADC → `fallback: true`.
- [ ] Step 7: Commit `feat(party): host PIN routes and Gemini band cards`.

### Task 4: Player page `/party`

**Files:** Create `app/party/page.tsx`, `app/party/PartyPlayer.tsx`; Modify `app/globals.css` (party section).

Screens: disabled → join (room code from `?room=`, name) → lobby ("Chờ host bắt đầu…", player count) → countdown to `startAt` → playing (`<Lane>` + HUD: điểm, tim, "Còn X/Y", đồng hồ; input as in solo) → out ("Bạn hạng N/M · điểm", missed words, "Còn K người…") → ended (rank, top 3, own card if any). Engine `start` with `{ party: { seed } }` and `partyPool(...)`. Publish `{score, lives, map, cleared, accuracy, wpm, alive, missed}` at most every 500 ms, immediately on life loss / over. Stop ticking when room status `ended`.

- [ ] Step 1: Implement; Step 2: open two browser tabs at 375×667, join same room → both appear in lobby (verified with Task 5 host).
- [ ] Step 3: Commit `feat(party): player page`.

### Task 5: Host page `/party/host`

**Files:** Create `app/party/host/page.tsx`, `app/party/PartyHost.tsx`; Modify `app/globals.css`; dep `qrcode` + `@types/qrcode`.

Screens: PIN → lobby (big QR to `${origin}/party?room=CODE`, code, player names, mode + difficulty selectors, "Bắt đầu" disabled with 0 players) → playing (header with code/topic/timer, "CÒN X / Y NGƯỜI", player cards with score + hearts, eliminated dimmed; host loop every 500 ms checks `shouldEnd`) → ended (top 3 + band cards; fetch `/api/party/report` with PIN; "Vòng mới" → `backToLobby`).

- [ ] Step 1: Implement; Step 2: full round locally with host tab + 2 player tabs: elimination, timer, ranking, fallback cards.
- [ ] Step 3: Commit `feat(party): host big-screen page`.

### Task 6: Google Cloud setup + Cloud Run deploy (via the owner's Chrome)

- [ ] New GCP project; link billing account "GDP Event Credit: Road to DevFest Ho Chi Minh City 2026" (**ask owner first**).
- [ ] Add Firebase to the project (**ask before accepting terms**); create RTDB in `asia-southeast1`; enable Anonymous Auth; paste `database.rules.json`; register web app → copy config into `app/party/firebase.ts`.
- [ ] Enable Cloud Run, Cloud Build, Artifact Registry, Vertex AI APIs; grant the Cloud Run runtime service account `roles/aiplatform.user`.
- [ ] Get code into Cloud Shell (push a `party-mode` branch — **ask owner first**), `gcloud run deploy kmafi-party --source . --region asia-southeast1 --allow-unauthenticated --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=<id>,GOOGLE_CLOUD_LOCATION=<loc>`.
- [ ] Owner adds `PARTY_HOST_PIN` in Cloud Run → Variables & secrets.
- [ ] Verify on the `*.run.app` URL: solo `/` works; host + 2 real phones play a full round; real Gemini cards appear; set budget alert.
