# JSON-LD Component Merge Design

## Goal

Merge the game-specific JSON-LD component into `src/app/_components/JsonLd.tsx`
so the repository has one JSON-LD component module and one shared script
serialization path. Preserve the existing JSON-LD data exactly.

## Architecture

`src/app/_components/JsonLd.tsx` will export:

- `JsonLdScript`, the generic renderer responsible for emitting the JSON-LD
  script element and safely serializing its `data` prop.
- `GameJsonLd`, the existing game-specific helper, moved from
  `src/components/GameJsonLd.tsx`.
- Existing URL and breadcrumb helpers without behavioral changes.

`GameJsonLd` will continue accepting `name`, `description`, `path`, and `skill`.
It will build the same graph with the same fields and values, then delegate
rendering to `JsonLdScript`. No game page data or layout JSON-LD will change.

The duplicate `src/components/GameJsonLd.tsx` file will be removed, and all
game pages will import `GameJsonLd` from the consolidated module.

## Data Flow

1. A game page passes its existing props to `GameJsonLd`.
2. `GameJsonLd` derives the same absolute URL and constructs the same
   `BreadcrumbList` plus `LearningResource` graph.
3. `GameJsonLd` passes that graph as `data` to `JsonLdScript`.
4. `JsonLdScript` serializes the graph using the existing `<` escaping behavior
   and emits the sole JSON-LD script element.

The refactor changes component ownership and serialization reuse only. It must
not alter graph content, page props, URLs, schema types, or metadata values.

## Error Handling and Compatibility

No new fallback or error behavior is needed. The existing JSON serialization
behavior remains centralized in `JsonLdScript`; invalid data continues to
surface through the normal rendering path rather than being silently replaced.
The public `GameJsonLd` props and the generic `JsonLdScript` API remain
unchanged.

## Validation

- Search the source tree to confirm no import references
  `@/components/GameJsonLd`.
- Run the repository's focused lint, type-check, or build validation available
  for the changed TypeScript files.
- Confirm the changed game pages still render through `JsonLdScript` and that
  no new explicit JSON-LD script tags are introduced outside the shared
  renderer.

## Scope Boundaries

This change does not modify JSON-LD data, page metadata, layout JSON-LD,
package manifests, lockfiles, or unrelated worktree changes.
