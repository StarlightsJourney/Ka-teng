# Ka-teng Architecture

Ka-teng is a browser-only React application that visualizes family lineage in 2D. The architecture separates pure domain logic from React/UI adapters so that layout stays pure and testable while the renderer only draws it.

## High-level data flow

```text
Blank canvas (default)  or  JSON sample dataset (big-tree.json, via /?sample)
        ↓
  src/data/  (normalizeWikidata, loadBigTree)
        ↓
  src/element/  (Person, Family types and pure helpers)
        ↓
  src/scene/  (familyLayout, family components, search, neighbor navigation)
        ↓
  src/actions/  (pure Action objects that transform AppState)
        ↓
  src/components/App.tsx  (orchestrates state and renders the tree)
        ↓
  src/renderer/  (FamilyGraph: React cards + SVG connectors + d3-zoom camera)
        ↓
  src/components/  (TopBar, PeopleTray, SearchBox, DetailsPanel, ThemeToggle)
```

## User flow

- **Blank by default.** The app opens on an empty canvas. `/?sample` or the **Sample family** switch in the People tray loads the bundled sample (`src/data/big-tree.json`, British royal family).
- **First person.** On an empty canvas, **+ Add first person** places that person on the canvas immediately.
- **People tray** (`PeopleTray.tsx`). Lists every person not connected to the currently displayed tree, with a filter box and **+ New person**. Later people start in the tray, outside the tree. On phones it is a drawer that collapses when a drag starts.
- **Drop to connect.** Dropping a tray card onto a tree card opens a relationship picker (Parent / Spouse / Child). Options that would create duplicates, self-links, ancestor cycles or make siblings each other's parent/child/spouse are disabled. Kinship rules live in `src/element/family.ts` (`canConnectKin`, `connectKin`, `linkCoParents`).
- **Ask, never guess.** After every connection, `suggestFollowUps` lists links that might also be true (a new spouse's step-children, the other parent's other children, a parent's spouse). `FollowUpPrompt` shows them unticked; only ticked ones are applied via `connectSuggestions`. The only automatic link is co-parents becoming partners when a child gets a second parent. After a first parent is linked the prompt also offers **+ Add other parent** (opens `AddRelativeModal` for the child).
- **Siblings.** The picker's Sibling option asks “same parents?”. Yes → `connectSibling(…, 'full')` joins the other's parents, or records an explicit `siblings` link when neither has parents. No → `stepSiblings` link. The layout keeps linked siblings on one row, adjacent, and returns `siblingLinks` (pairs without a shared visible parent) which the renderer draws as a bracket above the cards — solid for full, dashed for step.
- **Drag-to-connect inside the tree.** Each tree card has a ⠿ grip; dragging it onto another card links two people already in the tree through the same picker, so no duplicate person is created.
- **Remove vs delete.** "Remove from tree…" detaches all of a person's links and returns them to the tray (reversible, no typed confirmation). Permanent deletion happens only from the tray.
- **Layout.** `scene/familyLayout.ts` lays out the whole connected family: one row per generation, spouses adjacent, children centred under their parents (barycentric row ordering + alternating up/down relaxation passes, order-preserving packing). User-built trees use a stable root so selecting someone never re-lays out the tree; the sample uses a depth-3 window around the focused person with `+N` expanders and **Show all**.
- **Camera.** On load and structural changes the camera fits the tree if it is readable, otherwise centres the focused person. Selecting someone only pans if their card is hidden (e.g. behind the details panel or bottom sheet). Closing the panel never moves the camera.
- **Cards.** Compact (horizontal) and photo (portrait, name below) modes, toggled from the view toolbar and remembered in `localStorage`.
- **Views.** Focus (`maxDepth: 1` + `includeSiblings`), Family (`maxDepth: 3` around the focus) and All (whole component from a stable root), remembered in `localStorage`. `anchorLayout` shifts every re-rooted layout so the focused person keeps their previous coordinates — cards never jump to the camera; the camera glides to the card.
- **Autosave.** `data/autosave.ts` writes the “My tree” workspace to `localStorage` (debounced) and restores it on load and when switching back from the sample. The sample is never autosaved.
- **Removal impact.** `removalImpact(people, id, focusId)` (actions) reports the connections that go and the people who would be cut off from the kept part of the tree; `detachPersonAction` keeps focus on the largest remaining group so the warning matches what happens.
- **Photo framing.** `Person.avatarFocus` `{ x, y, zoom }` (validated in the file format) → `avatarImageStyle()` sets `object-position` and `scale` everywhere an avatar is drawn; `PhotoAdjuster` edits it.
- **Camera gotcha.** The viewport uses `overflow: clip` (plus a scroll pin) — focusing a card must never let the browser scroll the hidden-overflow container, which used to shift the whole stage off-centre.
- **Save / open.** `data/familyFile.ts` serialises `{ app, version, savedAt, focusId, people }` JSON and validates/sanitises files on open (ids, links, avatar URLs, text lengths, version).
- **Details panel.** Responsive width, wrapped names, one close control per surface (× in view mode; Cancel + Save in forms). Esc and backdrop clicks close modals.
- **Persistence.** State lives in memory; users save and open files explicitly. There is no autosave.

## Module responsibilities

### `src/element/` — pure domain

- `types.ts` — canonical `Person`, `Family`, `Gender`, `PersonId` types.
- `person.ts`, `family.ts` — pure helpers: name formatting, lifespan, initials, relationship labels.
- No side effects, no React, no DOM.

### `src/scene/` — pure scene logic

- `search.ts` — fuzzy search over people.
- `familyLayout.ts` — pure generational layout (positions, families, couples, hidden-relative counts, optional depth window).
- `largestFamily.ts` — choose a reasonable default root for the tree.
- `neighbor.ts` — keyboard arrow navigation on the family tree.
- All functions are pure; they receive `Person` collections and return derived data.

### `src/actions/` — state transitions

- `types.ts` defines `AppState` and `Action`.
- Each action is an object `{ name, perform(state) => state }`.
- Actions are the only way `AppState` changes.
- Includes selection, search, expand/collapse, edit, add, connect, remove-from-tree (detach all links, back to tray), and permanent delete.

### `src/data/` — data loading

- `loadBigTree.ts` normalizes raw Wikidata-shaped JSON into `Person[]`. It is only used when the sample dataset is requested.
- `familyFile.ts` — the save/open file format and its validation.

### `src/renderer/` — library adapters

- `FamilyGraph.tsx` renders the layout: React cards (compact/photo, ⠿ grip, drop targets, +N, edit), SVG connectors tweened with the cards, a d3-zoom camera (pan, pinch, wheel) and the view toolbar.
- If the renderer is replaced, only this file changes; `element`, `scene`, and `actions` remain untouched.

### `src/components/` — application UI

- `App.tsx` owns `AppState` and theme.
- `TopBar.tsx` — brand, search, Open / Save, show-all toggle (sample only), theme toggle.
- `PeopleTray.tsx` — left tray of people not in the displayed tree: + New person, filter, Sample family switch, drag sources, permanent delete.
- `SearchBox.tsx` — searchable input with keyboard-driven suggestions.
- `DetailsPanel.tsx` — read person details and edit/remove/add-relationship state.
- `AddPersonModal.tsx` — create a new person and connect them to the selected person.
- `DropConnectPicker.tsx` — Parent / Spouse / Child chooser shown after a drop, with invalid options disabled.
- `FollowUpPrompt.tsx` — “Any other connections?” checklist shown after a connection when follow-ups exist.
- `AddRelativeModal` — the single “+ Add …” picker in the details panel: create a new person or pick an existing one.
- `PersonCard.tsx` — small person display used inside panels.
- `ThemeToggle.tsx` — light/dark switch.

### `src/theme/`

- `tokens.css` — CSS custom properties for colors, radii, shadows, and spacing.
- `index.ts` — `useTheme` hook; persists mode in `localStorage` and sets `data-theme`.

## Boundaries

- **Renderer boundary:** d3-zoom and DOM measurement stay inside `renderer/`. Layout maths stays in `scene/`. The rest of the app works with `Person`.
- **State boundary:** only `App.tsx` calls action `perform`. Child components receive callbacks.
- **Data boundary:** `element` types are the source of truth. Normalization happens once at load time.
- **Theme boundary:** tokens are CSS variables; components reference variables, not hard-coded values.

## IDs, timestamps, and serialization

- `PersonId` is an opaque string derived from source data.
- Dates are stored as strings (`birth`, `death`, `birthDate`, `deathDate`) and displayed via pure helpers.
- Family files are versioned (`version: 1`); files from a newer version are refused.

## Build and deployment

- `vite.config.ts` sets `base: process.env.VITE_BASE ?? '/'`. Local dev and CI use `/`; the Pages deploy builds with `VITE_BASE=/Ka-teng/`.
- `.github/workflows/ci.yml` runs lint, unit tests, build, and Playwright e2e (Chromium) on push to `main` and on pull requests; Playwright reports are uploaded on failure.
- `.github/workflows/deploy.yml` re-runs lint, unit tests, and build, then deploys `dist/` to GitHub Pages (<https://starlightsjourney.github.io/Ka-teng/>). Pages must be set to **Source: GitHub Actions** in repo settings once.

## Future persistence (if added)

- One module owns migrations, schema, and connection access.
- Runtime writes use OS app-data/cache directories.
- Shared contract types (`src/element/types.ts`) require coordinator sign-off.
