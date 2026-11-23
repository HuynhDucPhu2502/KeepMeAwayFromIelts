# Route JSON-LD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all JSON-LD script output through `JsonLdScript`, source eight game breadcrumbs from `findHubGameById`, and add explicit breadcrumbs for `/deck` and `/party` without changing existing `LearningResource` data.

**Architecture:** Keep `JsonLdScript` as the only JSON-LD script emitter. Extend `GameJsonLd` with a required route breadcrumb source: a `HubGameId` for registry-backed routes or an explicit `BreadcrumbItem` for `/deck` and `/party`. Replace the raw layout script with `JsonLdScript` while leaving `JSON_LD_GRAPH` unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, ESLint, schema-dts.

---

### Task 1: Add registry and explicit breadcrumb support to `GameJsonLd`

**Files:**
- Modify: `src/app/_components/JsonLd.tsx`

- [ ] **Step 1: Add the registry import and route-specific prop types**

Update the imports and props in `src/app/_components/JsonLd.tsx`:

```tsx
import { findHubGameById, type HubGameId } from "@/lib/games-registry";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import type { BreadcrumbList, WithContext } from "schema-dts";

type GameJsonLdProps = {
  name: string;
  description: string;
  path: string;
  skill: string;
} & (
  | { gameId: HubGameId; breadcrumb?: never }
  | { breadcrumb: BreadcrumbItem; gameId?: never }
);
```

This makes every route explicitly identify its breadcrumb source. Registry
routes use `gameId`; special routes use `breadcrumb`.

- [ ] **Step 2: Resolve the current breadcrumb item explicitly**

At the start of `GameJsonLd`, resolve the current breadcrumb item before
constructing the graph:

```tsx
  const currentBreadcrumb = "gameId" in props
    ? findHubGameById(props.gameId)
    : props.breadcrumb;

  if (!currentBreadcrumb) {
    throw new Error(
      `"${"gameId" in props ? props.gameId : "breadcrumb"}" did not resolve a JSON-LD breadcrumb item`,
    );
  }
```

Destructure the existing `name`, `description`, `path`, and `skill` values
from `props` so the `LearningResource` object remains unchanged:

```tsx
export function GameJsonLd(props: GameJsonLdProps) {
  const { name, description, path, skill } = props;
  // resolve currentBreadcrumb here
```

Use `currentBreadcrumb.name` and `currentBreadcrumb.href` only for the second
`ListItem` in the existing `BreadcrumbList`. Do not replace the
`LearningResource` name, description, URL, skill, image, or provider fields.

- [ ] **Step 3: Run focused lint**

Run:

```powershell
pnpm exec eslint src/app/_components/JsonLd.tsx
```

Expected: the command exits successfully.

### Task 2: Use the shared renderer in the root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Import `JsonLdScript`**

Add:

```tsx
import { JsonLdScript } from "@/app/_components/JsonLd";
```

Keep the existing `HUB_GAMES`, SEO imports, `JSON_LD_GRAPH`, and all graph
values unchanged.

- [ ] **Step 2: Replace the raw layout script**

Replace:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_GRAPH) }}
/>
```

with:

```tsx
<JsonLdScript data={JSON_LD_GRAPH} />
```

No explicit JSON-LD `<script>` tag should remain in `layout.tsx`.

### Task 3: Update registry-backed route pages

**Files:**
- Modify: `src/app/(games)/typing/page.tsx`
- Modify: `src/app/(games)/reading/page.tsx`
- Modify: `src/app/(games)/writing/page.tsx`
- Modify: `src/app/(games)/writing-lab/page.tsx`
- Modify: `src/app/(games)/listening/page.tsx`
- Modify: `src/app/(games)/blitz/page.tsx`
- Modify: `src/app/(games)/scramble/page.tsx`
- Modify: `src/app/(games)/speaking/page.tsx`

- [ ] **Step 1: Add the registry ID to each `GameJsonLd` call**

Add the matching `gameId` prop while leaving all existing props unchanged:

```tsx
<GameJsonLd
  gameId="typing"
  name="Gõ Từ Rơi IELTS"
  description="..."
  path="/typing"
  skill="IELTS Academic Vocabulary & Typing Speed"
/>
```

Use this exact mapping:

| Page | `gameId` |
| --- | --- |
| `typing` | `"typing"` |
| `reading` | `"reading"` |
| `writing` | `"writing"` |
| `writing-lab` | `"writing-lab"` |
| `listening` | `"listening"` |
| `blitz` | `"blitz"` |
| `scramble` | `"scramble"` |
| `speaking` | `"speaking"` |

- [ ] **Step 2: Verify every registry ID is represented once**

Run:

```powershell
rg --line-number 'gameId=' 'src/app/(games)'
```

Expected: eight matches, one for each registry-backed route.

### Task 4: Add explicit breadcrumbs for special routes

**Files:**
- Modify: `src/app/(games)/deck/page.tsx`
- Modify: `src/app/(party)/party/page.tsx`

- [ ] **Step 1: Add explicit `/deck` breadcrumb data**

Pass this prop to the existing `GameJsonLd` call:

```tsx
breadcrumb={{ name: "Bộ Từ Riêng · Chia Sẻ Bằng Link", href: "/deck" }}
```

Keep the existing `name`, `description`, `path`, and `skill` values unchanged.

- [ ] **Step 2: Add explicit `/party` breadcrumb data**

Pass this prop to the existing `GameJsonLd` call:

```tsx
breadcrumb={{
  name: "Đấu Phòng Party · IELTS Typing Battle Royale",
  href: "/party",
}}
```

Keep the existing `name`, `description`, `path`, and `skill` values unchanged.

- [ ] **Step 3: Confirm `/party/host` remains unchanged**

Run:

```powershell
rg --line-number 'JsonLd|application/ld\\+json' 'src/app/(party)/party/host/page.tsx'
```

Expected: no matches.

### Task 5: Validate the complete JSON-LD refactor

**Files:**
- Verify: all files changed in Tasks 1-4
- Do not modify: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or unrelated worktree changes

- [ ] **Step 1: Verify raw JSON-LD output is centralized**

Run:

```powershell
rg --line-number 'application/ld\\+json|dangerouslySetInnerHTML' src
```

Expected: JSON-LD serialization appears only in
`src/app/_components/JsonLd.tsx`; the layout and route pages contain no raw
JSON-LD script markup.

- [ ] **Step 2: Run repository lint**

Run:

```powershell
pnpm lint
```

Expected: ESLint exits successfully.

- [ ] **Step 3: Run the production build**

Run:

```powershell
pnpm build
```

Expected: Next.js compiles, type-checks, and generates all routes successfully.

- [ ] **Step 4: Inspect the scoped diff**

Run:

```powershell
git --no-pager diff -- src/app/layout.tsx src/app/_components/JsonLd.tsx src/app
```

Confirm that the layout graph and all route `LearningResource` data are
unchanged, while breadcrumb lookup and script rendering are the only behavior
changes.
