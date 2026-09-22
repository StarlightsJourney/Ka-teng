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

