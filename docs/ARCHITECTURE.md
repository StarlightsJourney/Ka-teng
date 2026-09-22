# Ka-teng Architecture

Ka-teng is a browser-only React application that visualizes family lineage in 2D and a separate friends-only social graph in 3D. The architecture separates pure domain logic from React/UI adapters so that visualization libraries remain replaceable.

## High-level data flow

```text
JSON datasets (big-tree.json, friends.json)
        ↓
  src/data/  (normalizeWikidata, loadFriends)
        ↓
  src/element/  (Person, Friend, Family types and pure helpers)
        ↓
  src/scene/  (search, hierarchy pruning, neighbor navigation, social layout)
        ↓
  src/actions/  (pure Action objects that transform AppState)
        ↓
  src/components/App.tsx  (orchestrates state and renders modes)
        ↓
  src/renderer/  (React adapters around family-chart and react-force-graph-3d)
        ↓
  src/components/  (TopBar, SearchBox, DetailsPanel, FriendPanel, ThemeToggle)
```

## Module responsibilities

### `src/element/` — pure domain

- `types.ts` — canonical `Person`, `Family`, `Friend`, `Gender`, `PersonId` types.
- `person.ts`, `family.ts`, `friend.ts` — pure helpers: name formatting, lifespan, initials, relationship labels.
- No side effects, no React, no DOM.

### `src/scene/` — pure scene logic

- `search.ts` — fuzzy search over people/friends.
- `pruneHierarchy.ts` — limit tree depth and child count for the 2D chart.
- `largestFamily.ts` — choose a reasonable default root for the tree.
- `neighbor.ts` — keyboard arrow navigation on the family tree.
- `social.ts` — Dunbar-ring layout logic for Peng-yu 3D graph.
- All functions are pure; they receive `Person`/`Friend` collections and return derived data.

### `src/actions/` — state transitions

- `types.ts` defines `AppState` and `Action`.
- Each action is an object `{ name, perform(state) => state }`.
- Actions are the only way `AppState` changes.
- Includes selection, search, expand/collapse, edit, remove.

### `src/data/` — data loading

- `loadBigTree.ts` normalizes raw Wikidata-shaped JSON into `Person[]`.
- `friends.ts` loads and types `friends.json`.
- JSON stays in source; no runtime persistence layer exists today.

### `src/renderer/` — library adapters

- `FamilyChart2D.tsx` wraps `family-chart`, handles zoom/pan, card HTML, overflow toasts, and lifecycle.
- `familyChartAdapter.ts` converts `Person[]` into `family-chart`’s expected data shape.
- `SocialGraph3D.tsx` wraps `react-force-graph-3d` for Peng-yu mode.
- If a renderer is replaced, only these files change; `element`, `scene`, and `actions` remain untouched.

### `src/components/` — application UI

- `App.tsx` owns `AppState`, theme, and mode switching (`ka-teng` ↔ `peng-yu`).
- `TopBar.tsx` — brand, mode switch, search, show-all toggle, theme toggle.
- `SearchBox.tsx` — searchable input with keyboard-driven suggestions.
- `DetailsPanel.tsx` — read person details and edit/remove person state.
- `FriendPanel.tsx` — read friend details in Peng-yu mode.
- `PersonCard.tsx` — small person display used inside panels.
- `ThemeToggle.tsx` — light/dark switch.

### `src/theme/`

- `tokens.css` — CSS custom properties for colors, radii, shadows, and spacing.
- `index.ts` — `useTheme` hook; persists mode in `localStorage` and sets `data-theme`.

## Boundaries

- **Renderer boundary:** `family-chart` types and DOM manipulations stay inside `renderer/`. The rest of the app works with `Person`/`Friend`.
- **State boundary:** only `App.tsx` calls action `perform`. Child components receive callbacks.
- **Data boundary:** `element` types are the source of truth. Normalization happens once at load time.
- **Theme boundary:** tokens are CSS variables; components reference variables, not hard-coded values.

## IDs, timestamps, and serialization

- `PersonId` and `FriendId` are opaque strings derived from source data.
- Dates are stored as strings (`birth`, `death`, `birthDate`, `deathDate`) and displayed via pure helpers.
- No runtime serialization of app state to disk today.

## Future persistence (if added)

- One module owns migrations, schema, and connection access.
- Runtime writes use OS app-data/cache directories.
- Shared contract types (`src/element/types.ts`) require coordinator sign-off.
