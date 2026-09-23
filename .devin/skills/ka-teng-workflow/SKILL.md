---
name: ka-teng-workflow
description: Run a real vertical-slice workflow test on Ka-teng after changes to data, rendering, search, editing, theme, or state layers
triggers:
  - user
allowed-tools:
  - read
  - grep
  - edit
  - exec
  - browser_preview
permissions:
  allow:
    - Read(src/**)
    - Read(docs/**)
    - Read(package.json)
    - Write(src/**)
    - Exec("npm run *")
    - Exec("npx vite *")
---

Run a vertical-slice workflow test on Ka-teng after any change to data loading, family-chart rendering, search, selection, editing, theme, or state transitions. Verify end-to-end behavior with real data and real browser interaction.

## When to use

Use this skill after changes to:

- `src/data/*` — dataset loading or normalization.
- `src/element/*` — domain types or pure helpers.
- `src/scene/*` — search, hierarchy, or neighbor navigation.
- `src/actions/*` — state transitions.
- `src/renderer/*` — family-chart adapter.
- `src/components/*` — UI panels, top bar, search, or theme.
- `src/styles.css` or `src/theme/*` — styling and tokens.

## Prerequisites

Check these before starting:

- Node.js 18+ installed.
- `npm install` has been run.
- No stale `dist/` or lock conflicts.

```bash
node --version
npm --version
ls node_modules/.package-lock.json
```

## Fixture generation (fallback)

Ka-teng uses committed JSON as real source data. If you need isolated test fixtures without modifying committed data, copy the existing dataset:

```bash
mkdir -p /tmp/ka-teng-fixtures
cp src/data/big-tree.json /tmp/ka-teng-fixtures/test-tree.json
```

Do not commit media, databases, or user data. If you need to wire the app to fixture files temporarily, edit `src/data/loadBigTree.ts` and revert before handoff.

## Numbered workflow

1. **Import data** — start the dev server; the app automatically loads `src/data/big-tree.json`.

   ```bash
   npm run dev
   ```

2. **Open media/file** — open `http://localhost:5173` in a browser. Confirm the top bar renders and the family tree appears.

3. **Reach the first cue/state** — verify:
   - The largest family root is centered.
   - Person cards show names and lifespans.
   - The navigation hint reads `↑ ↓ ← → navigate · ⌘K search` (or `Ctrl K` on non-Apple).

4. **Interact** — perform at least these actions:
   - Click a person card → details panel opens.
   - Use `⌘K`/`Ctrl K` → search box focuses.
   - Type in search → suggestions appear; select one → tree centers on that person.
   - Press arrow keys → selection moves to neighbors.
   - Click `+N` on a card with hidden relatives → branch expands.
   - Toggle light/dark theme → colors switch without reload.
   - Click `+ Add parent/spouse/child` in the details panel → choose to create a new person or connect an existing one.
   - Add/change a field in the edit form and save → card updates in the tree.

5. **Save item** — in Ka-teng mode, click Edit in the details panel, change a field, and click Save. Verify the card updates in the tree.

6. **Verify in collection/list** — confirm the tree reflects expand/collapse state and the details panel matches the selected person.

7. **Verify in review/scheduler** — run the validation commands and confirm all pass:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

## Hand-off checklist

For each changed workflow, mark one status:

- **Verified** — you personally ran the numbered workflow and all validation commands pass.
- **Working locally** — you ran the workflow and it works, but one or more validation commands need minor cleanup.
- **Mocked** — behavior is covered by unit tests or fixture data but not verified in the real app.
- **Environment-blocked** — a permission, browser, OS, or dependency issue prevents verification. Report the exact dialog/denial.
- **Not implemented** — intentionally out of scope.

Require personal verification before marking **Verified**.

## Failure reporting

If the workflow fails:

1. Capture the browser/app state (screenshot if possible).
2. Copy terminal/console logs.
3. Record exact file paths and line numbers involved.
4. Open a concise issue note with:
   - Expected vs observed behavior
   - Steps to reproduce
   - Blocker classification: `environment-blocked`, `dependency`, `code`, or `test-data`
   - Commands run and their output

## Known limitations

| Capability | Status | Notes |
|------------|--------|-------|
| Static JSON data | Verified path | Real source data; no import UI needed today. |
| In-memory edits | Working locally | Edits persist only until page refresh; no backend. |
| Live persistence | Not implemented | No DB or storage layer. |
| External avatar loading | Environment-blocked path | CORS/referrer can break images; app falls back to initials. |
| System-audio / mic / camera | Not implemented | Not required for this app. |
| Cross-platform desktop build | Not implemented | Browser-only; `dist/` is static. |

After completing the workflow, report the status of each changed workstream and any remaining blockers.
