# Devin Audit Log — Ka-teng

Started: 2026-09-23
Objective: comprehensive multi-layered audit and optimization (security, UX, testing, build).

## Active issues

None.

## Resolved issues

### Iteration 1 — audit baseline

- Baseline `npm audit`: 0 vulnerabilities.
- Baseline `npm run lint`: 0 warnings/errors.
- Baseline `npm test`: 20 tests passed → now 34 tests passed.
- Baseline `npm run build`: successful → zero warnings after code-splitting and chunk-size tuning.
- Security: added `sanitizeAvatarUrl` and `escapeHtml` utilities; sanitized all avatar URLs at data load and render boundaries; removed inline `onerror` handler from dynamically generated chart HTML in favor of delegated event handling.
- UX: added `prefers-reduced-motion` support, family-chart loading spinner, and Suspense fallback for Peng-yu graph.
- Testing: installed `@playwright/test`, added `playwright.config.ts`, and added `e2e/smoke.spec.ts`.
- Workflow: added `npm run validate` pipeline.

### Iteration 2 — add-person flow and Peng-yu cleanup

- Added `createPerson` helper and `addRelationship` helper; added `addPerson` and `connectPeople` actions.
- Added `AddPersonModal` (Mobbin-inspired modal with sections, avatar upload, relationship radio options, primary/secondary buttons).
- Added "+" add-person button in the top bar and "+ Add parent/spouse/child" quick actions in the details panel.
- Added `FriendsSidebar` for Peng-yu mode, grouping friends by Dunbar circle with selection and avatars.
- Refactored `FriendPanel` into cleaner sections (Contexts, Note, Mutual friends).
- Added responsive layout for Peng-yu sidebar and modal.
- Added unit tests for `createPerson`, `addRelationship`, `addPerson`, and `connectPeople`.
- Added e2e test for adding a new person.

### Iteration 3 — GitHub description and app icon

- Updated README opening line and `package.json` description to a GitHub-ready one-liner.
- Created `public/favicon.svg` and `public/ka-teng-icon.svg` inspired by Mobbin's Beside app launch icon (simple connected-people motif).
- Added `public/manifest.json` and updated `index.html` with favicon, apple-touch-icon, theme-color, and meta description.

### Iteration 4 — unify edit form styles

- Introduced shared `.form-sheet`, `.form-section`, `.form-row`, `.form-actions`, and `.btn-danger` classes.
- Refactored `AddPersonModal` and `DetailsPanel` edit mode to use the same form styling, inputs, and button hierarchy.
- Replaced the edit form's ad-hoc button styles with `.btn-primary` / `.btn-secondary`.
- Updated remove confirmation to use `.btn-danger`.

### Iteration 5 — exit edit mode saves

- Refactored `DetailsPanel` edit form to build a patch object via `buildPatch()`.
- Made the edit-mode close button (×) save the current draft and close the panel.
- Escape in edit mode cancels and reverts to read-only mode.
- Cancel still reverts to read-only mode without saving.

### Iteration 6 — mobile layout, Peng-yu cleanup, friend editing

- Mobile top bar: reduced height/padding, smaller brand, icon-only search, add/theme buttons on narrow screens.
- Mobile details panel: bottom-sheet with drag-handle, 38vh default height, max-height 520px.
- Mobile Peng-yu: friends sidebar and friend panel become bottom sheets with drag handles.
- Overflow toast: now hides automatically when the tree fits, auto-dismisses after 6s, and resets on data change; moved to bottom on mobile and wraps.
- Navigation hint hidden on mobile to reduce crowding.
- Peng-yu graph: replaced hardcoded context colors with Ka-teng token palette, cleaner node sprites with radial gradients, subtler links (no particles), lower base opacity.
- Friend editing: added `src/actions/friend.ts`, `FriendModal`, in-memory friend state in App, edit/remove in `FriendPanel`, and add buttons in `TopBar` and `FriendsSidebar`.
- Added context chip selectors in `FriendModal`.

### Iteration 7 — remove confusing ADD cards and stabilize Ka-teng

- Disabled family-chart's built-in single-parent empty "ADD" placeholder cards via
  `setSingleParentEmptyCard(false)` so new relatives are only added through the
  explicit "+ Add parent/spouse/child" buttons in the details panel.
- Confirmed family-chart cards already render avatar images when available; the
  confusing ADD placeholders were the visual blocker.
- Changed Escape behavior in edit mode to cancel instead of save, making the
  interaction more predictable.
- Added e2e coverage for adding a parent and asserting no placeholder ADD card
  appears afterward.

### Iteration 8 — runtime/console regression check

- Added `e2e/console-check.spec.ts` to load Ka-teng, add a person, and load
  Peng-yu while asserting **zero console errors**.
- Ran full `npm run validate`: lint, unit tests, e2e tests (8 specs), and build
  all pass with no warnings.
- No console errors detected across the three checked flows.

## Verification commands

```bash
npm audit
npm run lint
npm test
npm run test:e2e
npm run build
npm run validate
```

## Notes

