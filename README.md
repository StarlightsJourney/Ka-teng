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

## Building a tree

The app opens on a **blank canvas** so you can build your own family tree from scratch. **+ Add first person** puts that person straight onto the canvas. To explore the bundled sample dataset (`src/data/big-tree.json`, the British royal family), open `http://localhost:5173/?sample` or flip the **Sample family** switch in the People tray.

### The family graph

The tree is drawn by Ka-teng's own layout engine (`src/scene/familyLayout.ts` + `src/renderer/FamilyGraph.tsx`) rather than a third-party chart:

- One row per generation, oldest at the top. Couples sit side by side joined by a short line; their children hang from a single connector below the couple. Children of different partners get separate connectors.
- One **Focus · Family · All** switch in the top bar (beside the theme toggle) picks how much of the tree you see: **Focus** is the selected person's close family (parents, partners, children, siblings), **Family** is everyone within three steps of them, **All** is the whole connected family. **+N** on a card reveals hidden relatives.
- Clicking a card never moves the cards — your **view** glides to that person. When a view has to re-arrange around someone new (Focus/Family), the clicked card stays exactly where it was and the rest re-flows around it before the camera moves. Closing the panel never moves the camera.
- Cards and connectors animate smoothly when the family changes; new cards fade in.
- Pan by dragging the background; pinch or scroll to zoom. The top bar holds icon-only **Open** and **Save** (labels appear on hover), the view switch, a single **card-size** button that morphs between a landscape and portrait icon and animates every card between compact and photo, and **fit whole tree**. Choices are remembered.
- **Compact** cards show the avatar with a gender-coloured ring, the name and a clean lifespan (`Born 1994`, `1921 – 2000`). **Photo** cards are a solid surface (no transparent tints) with a large portrait, a thin frame and bar in the person's gender colour, and the name on one line (in Newsreader). Gender colours are **Ink & Plum** — deep ink-indigo and plum (periwinkle-grey and dusty lilac in dark mode), olive-sand for *Other* — and no card ever says “male” or “female”.
- **Photo framing:** after adding a photo, **Adjust** lets you drag the picture to centre the face and zoom in; the framing is saved with the person and used on every card, list and avatar.
- The background is an **interstellar** sky: you cruise slowly through a 3D starfield — stars stream out from a vanishing point, growing and glowing as they pass (with warp trails in dark mode) — over a diagonal galaxy band, indigo and plum nebulae and a few pulsing four-point flare stars, with the occasional shooting star. The vanishing point leans toward your pointer. Nothing pops in or out; 30 fps, paused when the tab is hidden, still under reduced motion.
- **Motion:** the People sheet slides in from and out to the left, the details sheet from and to the right (both slide up/down on phones); the top bar never moves. Slower changes (switching views or card size, opening the sample or a file) show an “Arranging the tree…” pill. Notices are large pills with a pulsing dot and never block clicks.
- **Splash:** on launch — and when you come back after 45 s away — a water droplet falls into the centre and ripples out behind the Ka-teng wordmark, then dissolves (skipped under reduced motion).
- On phones, cards are smaller (still readable), the view controls sit under the search bar, people live in a bottom **inventory** strip, and the selected card stays above the details sheet. On tablets and narrow laptops (under 1100 px) opening someone's details tucks the People sheet into its tab so the tree keeps room. Scrollbars are thin and follow the theme.
- The sample dataset is large, so it shows people within three steps of the focused person, with **+N** on cards that have hidden relatives and a **Show all** toggle. Trees you build are always shown in full.

### People tray

**People** holds everyone who is not connected to the tree on screen. On desktop it is a full-height sheet on the left edge (it widens on large monitors and collapses to a slim **People** tab). On phones it is a bottom **inventory** strip: scroll it sideways, and drag a person **up** onto a card to connect them; the count button opens the full list.

- **+ New person** creates a person card in the tray. The form has a name, a clickable avatar for a photo, a **Male / Female / Other** choice (leave it blank if you don't want to say), a **Born** date as Day · Month · Year where only the year is required, a **Deceased** switch that reveals **Died** and **Resting place**, and a short bio. Chinese name, Pinyin and nicknames live behind **More details**. Leaving the name empty and pressing **Add** (or **Save** when editing) highlights the name box in red, focuses it and says “Add a name to continue”.
- A **filter** box narrows the list by name.
- **Drag a card onto a person in the tree** and a picker asks whether the dragged person is that person's **Parent**, **Spouse**, **Child** or **Sibling**. Invalid options are disabled: duplicate links, self-links, ancestor cycles, and making siblings each other's parent/child/spouse.
- **Sibling** asks one question: *do they have the same parents?* **Yes** makes the dragged person a child of the other's parents (or, if nobody has parents yet, links them as siblings so the parents can be added later — Ka-teng will then ask whether the new parent is the sibling's parent too). **No** makes them **step-siblings**: a dashed bracket links them and nobody's parents change. Siblings are never drawn like a couple, and the details panel doesn't list them; sibling links can be removed from the edit form.
- **Permanent deletion** happens from the tray.

### Connections are asked, never guessed

After every connection Ka-teng looks for other links that *might* be true and asks you about them, with every box unticked:

- **Spouse** — “Is *Me* also *Dad*'s child?” for each child of either partner who still has fewer than two parents.
- **Parent** — the other parent's other children (“Is *Sis* also *Dad*'s child?”), and the new parent's spouse when the child has no other parent.
- **Child** — each spouse of the parent (“Is *Partner* also *Kid*'s parent?”).

The only automatic link is the guaranteed one: when a child gets a second parent, the two parents are linked as partners so the couple renders together.

When you add someone's **first parent**, the prompt also offers **+ Add other parent**, which opens the same picker as **+ Add parent**: choose someone already in your list or type a name to create them.

### Linking people already in the tree

Every tree card has a **⠿** grip (always visible on touch screens). Drag it onto another card to link two people who are already in the tree, using the same Parent / Spouse / Child picker and the same follow-up questions.

Each section of a selected person's details panel (Parents, Spouses, Children) has a single **+ Add …** button. It opens one picker: type a name to **Create** a new person, or choose someone already in your people list — the relationship can be switched in the same picker. Parent, spouse and child links can be removed with **×** in the details panel.

### Removing people

**Remove from tree…** in the edit form (or dragging a card's **⠿** grip onto the People list) detaches all of that person's links and moves them to People. It is reversible — drag them back to reconnect. The confirmation is precise: it lists the **connections** that will be removed (those people stay), and separately anyone who would **no longer be connected to the rest of the tree** and so also moves to People. To delete someone permanently, do it from the People list.

### Saving and opening files

- **Your tree is kept in this browser automatically** (on every change) and comes back after a reload — “Welcome back — restored your tree”. Switching to **Sample family** and back to **My tree** keeps it too. **Start a new tree…** at the bottom of the People sheet clears it.
- **Save** (top bar) downloads a file — people, photos you uploaded (with their framing), relationships and the focused person — as `ka-teng-family-YYYY-MM-DD.json`. When more than one family is loaded (for example in the sample), Save asks whether to save **This family** (everyone connected to the person on screen) or **Everything**.
- **Open** (top bar, or **Open a saved file** on the empty canvas) loads a saved file. Files are validated before anything is replaced: unknown fields are dropped, unsafe image URLs are removed, broken links are ignored, and duplicate ids or files from a newer version are rejected with a message. If you have unsaved changes you're asked before they're replaced.
- Leaving the page with unsaved changes triggers the browser's “leave site?” warning. Nothing is uploaded anywhere; files stay on your device.

### Details panel

The details panel is a full-height sheet on the right edge (a bottom sheet on phones). It leads with the photo (gender-coloured ring) and the name beside a matching colour bar, then the facts in words — “Born 12 March 1994 · age 32”, “Died 5 May 2000 · aged 79”, resting place — and the bio clamped to three lines with **Read more**. Parents, Spouses and Children each show up to four people with **Show all N** for longer lists. Each surface has one clear close control: **×** in view mode, **Cancel** and **Save** in forms. **Esc** and clicking the backdrop also close modals. **Edit** opens a centred dialog. Arrow keys move between relatives of the selected person.

## Quick vertical-slice workflow test

1. **Open the app** — `npm run dev`, then open `http://localhost:5173`. The canvas is blank.
2. **First person** — click **+ Add first person** and enter a name. Their card appears in the centre of the canvas.
3. **Create relatives** — click **+ New person** in the People tray for a parent, the other parent and a sibling.
4. **Connect** — drag the first parent onto your card and choose **Parent**; drag the other parent onto the first parent and choose **Spouse**, then tick “… is also … 's child” in the follow-up. Drag the sibling onto a parent and choose **Child**, ticking the other parent in the follow-up.
5. **Check the layout** — parents side by side on the top row, you and your sibling below, joined by one connector. Switch to photo cards and to **Focus** view in the toolbar at the top; click a relative and the view glides to them.
6. **Remove and restore** — open a person, click **Edit**, then **Remove from tree…**. Confirm they appear in the People tray, then drag them back.
7. **Save and reopen** — click **Save**, refresh the page, click **Open** and pick the file. The same tree comes back.
8. **Sample data** — open `/?sample` (or toggle **Sample family**), search from the top bar, use arrow keys to navigate, `+N` to expand branches, and toggle light/dark theme. Repeat on a phone-sized window.

### Fixture generation (fallback)

If you need isolated test data, use the fixture shell fallback:

```bash
mkdir -p /tmp/ka-teng-fixtures
cp src/data/big-tree.json /tmp/ka-teng-fixtures/test-tree.json
```

Do not commit media, databases, or user data.

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs on every push to `main` and on every pull request. It runs `npm ci`, `npm run lint`, `npm test`, `npm run build`, installs Playwright Chromium, then runs `npm run test:e2e`. When a run fails, the Playwright HTML report and `test-results/` are uploaded as the `playwright-report` artifact. Newer pushes to the same ref cancel in-progress runs.
- **CD** (`.github/workflows/deploy.yml`) runs on push to `main` (and manually via *Run workflow*). It runs lint and unit tests, builds with `VITE_BASE=/Ka-teng/`, and deploys `dist/` to GitHub Pages at <https://starlightsjourney.github.io/Ka-teng/>.
- **One-time setup:** the repository owner must open **Settings → Pages** and set **Source** to **GitHub Actions**. Until then the deploy job fails.
- **Locally**, run `npm run validate` before opening a PR; it matches what CI checks. To preview the Pages build, run `VITE_BASE=/Ka-teng/ npm run build && npm run preview`.

## Project layout

```text
src/
├── actions/       State transitions for selection, search, expand, edit, add, connect.
├── components/    UI components at the application edge.
├── data/          Sample dataset, normalization, and the save/open file format.
├── element/       Pure person and family domain types and helpers.
├── renderer/      FamilyGraph: React + d3-zoom renderer for the family layout.
├── scene/         Pure family layout, components, neighbour and search logic.
├── theme/         Theme state and CSS design tokens.
├── main.tsx       Application entrypoint.
└── styles.css     Application layout and component styling.
```

See `docs/ARCHITECTURE.md` for modules and data flow and `docs/DESIGN_SYSTEM.md` for tokens and components.

## Architecture principles

- `element` and `scene` are pure-function core layers.
- `actions` are the only way application state changes.
- Layout is pure and tested (`scene/familyLayout.ts`); the renderer only draws it and owns the camera.
- Relationship rules live in `element/family.ts` (`canConnectKin`, `connectKin`, `suggestFollowUps`).

## Known limitations

- Your tree autosaves to this browser's storage; very large trees with many uploaded photos may exceed it (you'll be told — use **Save**). Changes to the sample family are not autosaved. The sample dataset is read-only JSON in source.
- Browser-only; no backend.
- Family circumstances that need placeholder people (unknown parents, “other” relationships) are not modelled yet.
- External avatar URLs may fail due to CORS or referrer policy; the app falls back to initials.

## License

MIT. See [LICENSE](./LICENSE).
