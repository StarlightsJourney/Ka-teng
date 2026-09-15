# Ka-teng

Ka-teng is an open-source family lineage visualisation with a navigable 2D family tree powered by [family-chart](https://github.com/donatso/family-chart).

## Peng-yu friends mode

Click the Ka-teng wordmark to switch to Peng-yu (朋友), a separate friends-only 3D social graph. Friends are arranged on Dunbar-ring shells, grouped by context, and can be explored with hover, selection, search, and camera controls. Peng-yu never changes the Ka-teng family dataset.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Useful checks:

```bash
npm run lint
npm test
npm run build
```

## Project layout

```text
src/
├── actions/       State transitions for selection, search, and view changes.
├── components/    UI components at the application edge.
├── data/          Source dataset and normalization.
├── element/       Pure person and family domain types and helpers.
├── renderer/      React adapters around family-chart.
├── scene/         Pure hierarchy, expansion, and search logic.
├── theme/         Theme state and Craft/Raycast design tokens.
├── main.tsx       Application entrypoint.
└── styles.css     Application layout and component styling.
```

## Architecture principles

- `element` and `scene` are pure-function core layers.
- `actions` are the only way application state changes.
- Renderers are adapters around visualization libraries.
- Family-chart-specific data keys stay inside `renderer/familyChartAdapter.ts`.

## License

MIT. See [LICENSE](./LICENSE).
