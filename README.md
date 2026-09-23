# Ka-teng

Ka-teng is an open-source family lineage visualiser: a navigable 2D family tree. Built with React, TypeScript, and Vite. Add people, edit details, and explore relationships in a single focused view.

## Agent entry point

This repo uses agent guidance in `AGENTS.md` and a reusable vertical-slice workflow skill at `.devin/skills/ka-teng-workflow/SKILL.md`. Read both before starting work. The project has its own design system in `src/theme/tokens.css` and `docs/DESIGN_SYSTEM.md`; do not replace its palette, fonts, or radii. Mobbin is available as optional UX/flow inspiration only (`.devin/skills/mobbin/SKILL.md`).

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Validation commands

Run the full validation pipeline before handoff:

```bash
npm run validate
```

`validate` runs lint, unit tests, end-to-end tests, and the production build. You can also run them individually:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

## Adding people

Click the **+** button in the top bar to add a new person, or use the **+ Add parent/spouse/child** buttons in a selected person's details panel. A Mobbin-inspired modal collects identity, photo, life dates, bio, and the relationship to the currently selected person. New people are stored in memory until the page is refreshed.

You can also connect an existing person to the selected person as a parent, spouse, or child instead of creating a duplicate.

## Quick vertical-slice workflow test

1. **Import data** — the app loads `src/data/big-tree.json` on startup. No manual import step is required.
2. **Open the tree** — `npm run dev`, then open `http://localhost:5173`. The largest family root is auto-selected.
3. **Reach the first cue/state** — verify the 2D tree renders, the top bar appears, and the navigation hint reads `↑ ↓ ← → navigate · ⌘K search`.
4. **Interact** — click a person card to open the details panel, use `⌘K`/`Ctrl K` to search, press arrow keys to navigate, click `+N` to expand branches, and toggle light/dark theme.
5. **Add a relative** — click `+ Add parent/spouse/child` in the details panel and choose to create a new person or connect an existing one.
6. **Verify in collection/list** — confirm the tree updates after adding/connecting and the details panel reflects the selected person.

### Fixture generation (fallback)

If you need isolated test data, use the fixture shell fallback:

```bash
mkdir -p /tmp/ka-teng-fixtures
cp src/data/big-tree.json /tmp/ka-teng-fixtures/test-tree.json
```

Do not commit media, databases, or user data.

## Project layout

```text
src/
├── actions/       State transitions for selection, search, expand, edit, add, connect.
├── components/    UI components at the application edge.
├── data/          Source dataset and normalization.
├── element/       Pure person and family domain types and helpers.
├── renderer/      React adapters around family-chart.
├── scene/         Pure hierarchy, expansion, and search logic.
├── theme/         Theme state and CSS design tokens.
├── main.tsx       Application entrypoint.
└── styles.css     Application layout and component styling.
```

See `docs/ARCHITECTURE.md` for modules and data flow and `docs/DESIGN_SYSTEM.md` for tokens and components.

## Architecture principles

- `element` and `scene` are pure-function core layers.
- `actions` are the only way application state changes.
- Renderers are adapters around visualization libraries.
- Family-chart-specific data keys stay inside `renderer/familyChartAdapter.ts`.

## Known limitations

- Data is read-only JSON in source. Edits exist only in client memory until a page refresh.
- Browser-only; no backend or persistence layer today.
- External avatar URLs may fail due to CORS or referrer policy; the app falls back to initials.

## License

MIT. See [LICENSE](./LICENSE).
