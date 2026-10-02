# Agent Guidance — Ka-teng

Required reading before any agent starts work. This document preserves Ka-teng’s existing design system and workflow while adopting disciplined agent collaboration, Mobbin-driven UX/flow reference, automatic escalation, and vertical-slice verification.

## Shared rules summary

- **One design system per project.** No per-feature palettes or competing button libraries. Reuse the project’s existing tokens (`src/theme/tokens.css`) and shared components (`src/components/`).
- **Feature code stays with the feature; reusable visual components live in the shared UI package; platform capture stays behind adapters.** For Ka-teng: pure domain logic lives in `src/element/` and `src/scene/`, state transitions in `src/actions/`, React adapters in `src/renderer/`, and application UI in `src/components/`.
- **Strict TypeScript, no `any`, avoid effect loops.** `tsconfig.app.json` enables `noUnusedLocals`, `noUnusedParameters`, and `erasableSyntaxOnly`. Do not broaden types to escape errors.
- **Production Rust must be fallible:** explicit `Result`, no `unwrap` on user/device/file/model/network paths. *(Ka-teng is currently TypeScript/browser; apply this rule to any future Rust/backend work.)*
- **One shared persistence layer owns migrations and connection access.** *(Currently data is JSON-in-source; future DB/persistence work must centralize ownership.)*
- **Runtime writes go to OS app-data/cache directories, never the repo root.** Do not write user media, databases, or logs into the source tree.
- **Do not commit secrets, models, user media, local databases, build output, or editor state.** `dist/`, `node_modules/`, `*.local`, `tmp-*`, and editor directories are already ignored. Add new runtime artifacts to `.gitignore` if needed.
- **Shared files are coordinator-owned.** Migrations, contracts, dependency manifests, design tokens (`src/theme/tokens.css`), root config (`package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`), `AGENTS.md`, `README.md`, and `docs/` require coordinator sign-off. Other agents request changes via focused PRs.

## Aesthetic preservation rule

**Do not import Sheng’s color palette, typography, or radii.** This project has its own design system. Mobbin is used to improve user flows, motion, component patterns, and layout — not to swap palettes. Every change must reuse the project’s existing tokens and components unless the user explicitly requests a new design direction.

If the design system is not yet documented in `docs/DESIGN_SYSTEM.md`, the first agent task should be to document the existing tokens and shared components there, then refer back to it.

## How we work

- **Parallelize independent workstreams by default.** Family-chart rendering, search, details-panel editing, and theme/shell can evolve independently as long as contracts in `src/element/` and `src/actions/` stay stable.
- **Be self-critical:** question whether a feature is usable, not just whether it compiles. Prefer UX over UI polish.
- **Use real-world data and real media for workflow testing.** Generated fixtures are a fallback.
- **Document environment quirks, permission requirements, and workflow changes as you go.** Append discoveries to this file or `docs/`.

## Stack and layout

- **Runtime:** React 18 + TypeScript + Vite 8.
- **Visualization:** own layout engine (`src/scene/familyLayout.ts`) rendered by `src/renderer/FamilyGraph.tsx` with React cards, SVG connectors and `d3-zoom`.
- **Data:** static JSON dataset (`src/data/big-tree.json`) normalized in `src/data/`.
- **State:** `src/actions/` holds pure `Action` objects; `src/components/App.tsx` is the only stateful orchestrator.
- **Styling:** hand-written CSS in `src/styles.css` with design tokens in `src/theme/tokens.css`. Light/dark themes via `data-theme` attribute.
- **Fonts:** Inter variable + Newsreader.

```text
src/
├── actions/       State transitions (selection, search, expand, edit, add, connect)
├── components/    UI components at the application edge
├── data/          Source datasets and normalization
├── element/       Pure person/family domain types and helpers
├── renderer/      React adapters around visualization libraries
├── scene/         Pure hierarchy, expansion, and search logic
├── theme/         Theme state and CSS tokens
├── main.tsx       Application entrypoint
└── styles.css     Application layout and component styling
```

## Module ownership table

| Workstream | Owned files | Shared/coordinator-owned |
|------------|-------------|--------------------------|
| Family tree 2D | `src/renderer/FamilyGraph.tsx`, `src/scene/familyLayout.*`, `src/scene/largestFamily.*` | `src/element/*`, `src/actions/*` |
| Search & navigation | `src/components/SearchBox.tsx`, `src/scene/search.*`, `src/actions/search.*`, `src/actions/select.*` | `src/element/types.ts`, `src/actions/types.ts` |
| Details & editing | `src/components/DetailsPanel.tsx`, `src/components/PersonCard.tsx`, `src/components/AddPersonModal.tsx`, `src/components/AddRelativeModal.tsx`, `src/components/FollowUpPrompt.tsx`, `src/actions/person.*` | `src/element/person.ts`, `src/element/family.ts` |
| People tray & drag-to-connect | `src/components/PeopleTray.tsx`, `src/components/DropConnectPicker.tsx`, `src/components/useDragConnect.ts`, `src/actions/workspace.ts`, `e2e/workflow.spec.ts` | `src/actions/types.ts`, `src/scene/largestFamily.ts` (`familyComponent`) |
| Theme & shell | `src/theme/*`, `src/components/TopBar.tsx`, `src/components/ThemeToggle.tsx`, `src/styles.css` | `src/theme/tokens.css` |
| Data & contracts | `src/data/loadBigTree.ts`, `src/data/big-tree.json` | `src/data/index.ts`, `src/element/types.ts` |
| Shared / root | — | `package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `README.md`, `AGENTS.md`, `docs/*`, `.devin/*` |

Shared files require coordinator sign-off before modification.

## Persistence conventions

Ka-teng currently uses read-only JSON source data. There is no runtime persistence layer. If persistence is introduced:

- One module owns the database, migrations, and connection access.
- Migrations live in a single ordered directory.
- Runtime writes go to OS app-data/cache directories, never the repo root.
- No source-tree user data is committed.

## Testing and validation

Agents must run these exact commands before handoff and report results:

```bash
npm run validate
```

`validate` runs lint, unit tests, end-to-end tests, and the production build in sequence. For granular reporting you may also run:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

Acceptance criteria:

- `npm run lint` — oxlint passes with no errors.
- `npm test` — vitest run passes (unit tests in `src/**/*.test.ts`; e2e specs are excluded via `vitest.config.ts`).
- `npm run test:e2e` — Playwright headless Chromium specs pass (`e2e/**/*.spec.ts`).
- `npm run build` — `tsc -b` and `vite build` succeed with zero warnings.

If any command fails, classify the blocker (environment, dependency, code, or test data) and report it. Do not mark a feature **Verified** until all three pass locally.

## Environment quirks and required permissions

- **Browser permissions:** no microphone, camera, or filesystem access are required today.
- **OS app-data writes:** not currently used; if added, agents must request user permission and report exact dialog/denial. Missing permission marks the feature **environment-blocked**, not silently disabled.
- **External image loading:** avatar URLs in datasets may fail due to CORS or referrer policy. The app handles this gracefully via `onerror` and initials fallbacks.
- **Blank canvas by default:** `/` opens an empty workspace. E2E specs that need the bundled dataset must navigate to `/?sample`.
- **Camera focus vs. selection:** `AppState.focusId` drives what the chart centres on; `selectedId` only drives the details panel. Closing the panel must never change `focusId`.
- **The graph shows the whole connected family** of the focused person (sample: depth-3 window). The People tray lists everyone outside `familyComponent(focusId)`.
- **Never infer relationships silently.** Any new connection must go through `suggestFollowUps` + `FollowUpPrompt` (unticked by default). The only automatic link is co-parents → partners. Siblings who share known parents are modelled through those parents; `siblings` (full, parents not yet known) and `stepSiblings` are explicit symmetric links used only for layout brackets and follow-ups — never shown as a list in the details panel and never drawn like a couple.
- **Save/open files** are client-side downloads/uploads (`src/data/familyFile.ts`); nothing is written to the repo or a server.
- **Relationship direction convention:** `connectPeople(a, b, kin)` / `disconnectPeople(a, b, kin)` always mean “a is b’s kin”. UI lists show relatives of the selected person, so call them as `(relativeId, selectedId, kin)`. Getting this backwards was a real bug (× in Parents/Children did nothing).
- **Keep relationship helpers linear.** `parentIdsOf`/`childIdsOf` scan the whole map; never call them inside a per-person loop over all people (that made the Add picker freeze on the 843-person sample). Precompute with `kinCheckerFor` or `buildRelations`-style maps.
- **No `backdrop-filter` over the animated starfield** — it forces a full re-blur every frame (a modal dropped to 13 fps). Use solid or `color-mix` surfaces.
- **Never use `aria-disabled` on a button that still does something** (the Add button shows a validation error when clicked); Playwright and screen readers treat it as unclickable. Style with a class instead.
- **Measure animated elements with `settledBox`** in e2e (modals scale in, sheets slide, toasts spring).
- **Gender colours** go through `data-gender` + `--g*` variables; never hard-code blue/pink or print “male/female” in the UI.
- **Drag in e2e:** use `page.mouse` down/move/up (pointer events), and wait for card positions to settle after tree transitions (650 ms) before dragging — see `settledBox` in `e2e/workflow.spec.ts`.
- **PATH / Node:** project expects Node 18+ and npm. Use `npm install` after dependency changes.
- **macOS / Windows / Linux:** build is browser-only, so cross-platform builds are limited to the dev server and static `dist/` output.

## Mobbin as optional UX/flow reference

Mobbin is an optional source of UX/flow inspiration — better buttons, motion, empty states, lists, dialogs, nav, and micro-interactions. Agents may use the `.devin/skills/mobbin/SKILL.md` skill when a screen or interaction would benefit from external inspiration, but they must apply it inside the project’s existing token system and shared components. Do not replace Ka-teng’s colors, fonts, or radii with Mobbin’s aesthetic.

## Automatic escalation policy

- The coordinator invokes the escalation specialist (`.devin/agents/escalation-specialist.md`) automatically after two materially different unsuccessful attempts at the same technical blocker.
- Only one specialist runs at a time; it cannot spawn subagents.
- **Do not delegate permission denials, missing credentials, or missing hardware.** Report those and continue other work.

## Branches and commits

- **Integration branch:** `main`.
- **Feature branch naming:** `feature/<short-description>` or `fix/<short-description>`.
- **Commit style:** concise, descriptive, focused on why not what.
- **No force-push.** Never rewrite published history.
- **No bot/AI co-author trailers.** Do not add `Co-Authored-By: Devin…` or vendor attributions. Human contributors own their commits.
- **GitHub contributor policy:** This project is maintained by its human team. Automated agents assist but are **not listed as contributors** on GitHub, are **not added to the repository as members/collaborators**, and do not push directly to `main` outside of reviewed PRs. Agents open pull requests for any non-trivial change; trivial docs fixes may be proposed as PRs and require human review before merge.
