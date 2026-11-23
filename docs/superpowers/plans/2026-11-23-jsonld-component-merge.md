# JSON-LD Component Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate game JSON-LD generation into `src/app/_components/JsonLd.tsx` while preserving every existing JSON-LD value and using the shared serializer.

**Architecture:** Keep `JsonLdScript` as the only component that emits the JSON-LD script element. Move `GameJsonLd` and its unchanged graph construction into the same module, make it delegate to `JsonLdScript`, update all game-page imports, and delete the duplicate component file.

**Tech Stack:** Next.js 16, React 19, TypeScript, ESLint, Node test runner.

---

### Task 1: Consolidate the JSON-LD component implementations

**Files:**
- Modify: `src/app/_components/JsonLd.tsx`
- Delete: `src/components/GameJsonLd.tsx`

- [ ] **Step 1: Add the game helper types and imports to the shared module**

In `src/app/_components/JsonLd.tsx`, add the existing `SITE_NAME` import alongside
`SITE_URL`, and add the `GameJsonLdProps` interface:

```tsx
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import type { BreadcrumbList, WithContext } from "schema-dts";

interface GameJsonLdProps {
  name: string;
  description: string;
  path: string;
  skill: string;
}
```

Keep the existing `JsonLdScript`, `absoluteUrl`, and
`jsonLdBreadcrumbList` APIs unchanged.

- [ ] **Step 2: Move the unchanged game graph construction into `JsonLd.tsx`**

Append this helper to `src/app/_components/JsonLd.tsx`:

```tsx
/** Emits BreadcrumbList + LearningResource JSON-LD for each mini-game page. */
export function GameJsonLd({
  name,
  description,
  path,
  skill,
}: GameJsonLdProps) {
  const url = `${SITE_URL}${path}`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name,
            item: url,
          },
        ],
      },
      {
        "@type": "LearningResource",
        name: `${name} — ${SITE_NAME}`,
        description,
        url,
        inLanguage: ["vi", "en"],
        isAccessibleForFree: true,
        educationalUse: "practice",
        learningResourceType: "Interactive Game",
        educationalLevel: "IELTS Band 5.0 - 9.0",
        teaches: skill,
        image: `${SITE_URL}/og-banner.png`,
        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
    ],
  };

  return <JsonLdScript data={graph} />;
}
```

This preserves the existing graph data and routes rendering through the
shared serializer, including its `<` escaping.

- [ ] **Step 3: Delete the duplicate component**

Delete `src/components/GameJsonLd.tsx` after the shared module contains the
helper. Do not alter any page props or graph values.

- [ ] **Step 4: Run ESLint on the changed component module**

Run:

```powershell
pnpm exec eslint src/app/_components/JsonLd.tsx
```

Expected: ESLint exits successfully with no errors.

### Task 2: Update game-page imports

**Files:**
- Modify: `src/app/(games)/blitz/page.tsx`
- Modify: `src/app/(games)/deck/page.tsx`
- Modify: `src/app/(games)/listening/page.tsx`
- Modify: `src/app/(games)/reading/page.tsx`
- Modify: `src/app/(games)/scramble/page.tsx`
- Modify: `src/app/(games)/speaking/page.tsx`
- Modify: `src/app/(games)/typing/page.tsx`
- Modify: `src/app/(games)/writing/page.tsx`
- Modify: `src/app/(games)/writing-lab/page.tsx`
- Modify: `src/app/(party)/party/page.tsx`

- [ ] **Step 1: Replace the deleted-module imports**

In each listed page, replace:

```tsx
import { GameJsonLd } from "@/components/GameJsonLd";
```

with:

```tsx
import { GameJsonLd } from "@/app/_components/JsonLd";
```

Leave each existing `<GameJsonLd ... />` invocation and all prop values
unchanged.

- [ ] **Step 2: Confirm no deleted-module imports remain**

Run:

```powershell
rg --fixed-strings '@/components/GameJsonLd' src
```

Expected: no matches.

- [ ] **Step 3: Confirm JSON-LD script emission remains centralized**

Run:

```powershell
rg --line-number 'application/ld\+json|<script' src/app/_components src/app src/components
```

Expected: the shared `JsonLdScript` contains the component-level JSON-LD
renderer, and no game page contains a new explicit JSON-LD script tag.

### Task 3: Validate the refactor

**Files:**
- Verify: all files changed in Tasks 1-2
- Do not modify: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, or unrelated worktree changes

- [ ] **Step 1: Run the repository lint script**

Run:

```powershell
pnpm lint
```

Expected: ESLint completes successfully.

- [ ] **Step 2: Run the repository test script**

Run:

```powershell
pnpm test
```

Expected: the Node test runner completes successfully. If the repository has
no tests, record that the command reports no test files rather than adding
unrelated tests.

- [ ] **Step 3: Run the production build**

Run:

```powershell
pnpm build
```

Expected: Next.js completes the production build without TypeScript, import,
or rendering errors.

- [ ] **Step 4: Inspect the final diff for data preservation**

Run:

```powershell
git --no-pager diff -- src/app/_components/JsonLd.tsx src/components/GameJsonLd.tsx src/app
```

Verify that only component ownership, delegation to `JsonLdScript`, and import
paths changed; the graph fields and values are identical to the original
`GameJsonLd` implementation.
