# Route JSON-LD Design

## Goal

Use the shared `JsonLdScript` component for the root layout JSON-LD and make
route-page breadcrumbs derive their current item from the game registry where
possible, while preserving existing `LearningResource` data.

## Architecture

`src/app/_components/JsonLd.tsx` remains the single JSON-LD rendering module:

- `JsonLdScript` is the only component that emits the
  `application/ld+json` script element.
- `GameJsonLd` continues to build each route's existing
  `BreadcrumbList` plus `LearningResource` graph.
- For the eight `HUB_GAMES` routes, `GameJsonLd` receives a registry ID and
  calls `findHubGameById` to obtain the breadcrumb item's title and path.
- `/deck` and `/party` use explicit breadcrumb constants because they are not
  entries in `HUB_GAMES`.

`src/app/layout.tsx` will import `JsonLdScript` and render the unchanged
`JSON_LD_GRAPH` object through it. The layout will no longer contain an
explicit JSON-LD script tag.

## Route Breadcrumb Data Flow

The breadcrumb shape is exactly:

1. `SITE_NAME` at `SITE_URL`.
2. The current route item.

For registry-backed routes, the page passes its `HubGameId` to `GameJsonLd`.
The helper calls `findHubGameById(id)` and uses the returned `title` and `path`
for the current breadcrumb item. A missing lookup is an explicit error and
must not produce incomplete JSON-LD.

For `/deck` and `/party`, the page passes explicit hardcoded name/path
constants for the current breadcrumb item. Their existing
`LearningResource` names, descriptions, URLs, skills, and other data remain
unchanged.

`/party/host` is excluded and receives no JSON-LD breadcrumb.

## Compatibility and Scope

The eight registry route pages keep their existing `GameJsonLd` props and
`LearningResource` values; only the breadcrumb current item is sourced from
the registry. `/deck` and `/party` keep their current graph content while
using explicit breadcrumb constants. No page metadata, layout graph data,
registry entries, package files, or unrelated worktree changes are modified.

No silent fallback is introduced for a missing registry ID. The shared
serializer retains its existing `<` escaping behavior.

## Validation

- Run ESLint and the production build.
- Verify `layout.tsx` no longer contains a raw JSON-LD script element.
- Verify all eight registry IDs resolve through `findHubGameById`.
- Verify `/deck` and `/party` use explicit breadcrumb constants.
- Verify `/party/host` has no JSON-LD component.
- Confirm the existing layout graph and route `LearningResource` fields are
  unchanged.
