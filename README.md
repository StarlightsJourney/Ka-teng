# Ka-teng

Ka-teng is an open-source family lineage visualisation that combines a navigable 2D family tree via [family-chart](https://github.com/donatso/family-chart) with a 3D force graph for exploring relationships at scale.

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
├── renderer/      React adapters for the 2D and 3D renderers.
├── scene/         Pure graph construction and search logic.
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
