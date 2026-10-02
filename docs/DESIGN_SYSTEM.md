# Ka-teng Design System

Ka-teng has its own visual identity: soft neutral surfaces, Newsreader display type for names and the brand, Inter for UI copy, and a light/dark theme switch. This document captures the existing tokens and components so agents reuse them instead of introducing competing palettes.

## Tokens (`src/theme/tokens.css`)

### Colors — light theme (default / `[data-theme='light']`)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F5F5F7` | App background |
| `--surface` | `#FFFFFF` | Floating surfaces, top bar |
| `--surface-solid` | `#FFFFFF` | Popovers, panels, suggestions |
| `--surface-2` | `rgba(0,0,0,.04)` | Hovers, avatars without image |
| `--surface-3` | `rgba(0,0,0,.08)` | Pressed/strong hover |
| `--border` | `rgba(3,3,2,.09)` | Default borders |
| `--border-strong` | `rgba(0,0,0,.12)` | Stronger borders |
| `--border-subtle` | `rgba(3,3,2,.06)` | Section dividers |
| `--text` | `#030302` | Primary text |
| `--text-2` | `rgba(3,3,2,.75)` | Secondary text |
| `--text-3` | `rgba(3,3,2,.5)` | Muted text, placeholders |
| `--text-4` | `rgba(3,3,2,.35)` | Hints, disabled |
| `--accent` | `#030302` | Primary button/focus in light mode |
| `--accent-fg` | `#FFFFFF` | Text on accent |
| `--accent-soft` | `rgba(0,0,0,.08)` | Soft accent background |
| `--link` | `#0087FF` | Interactive emphasis, path to main |
| `--male` / `--male-tint` / `--male-ink` | `#4A7FD6` / `#DBEDFE` / `#4A7FD6` | Male gender indicators |
| `--female` / `--female-tint` / `--female-ink` | `#D46A8A` / `#FFE0E8` / `#D46A8A` | Female gender indicators |
| `--neutral-tint` | `#FDE99B` | Gender-neutral/unknown tint |
| `--line` | `rgba(3,3,2,.25)` | Tree connection lines |

### Colors — dark theme (`[data-theme='dark']`)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#07080A` | App background |
| `--surface` | `rgba(255,255,255,.05)` | Floating surfaces |
| `--surface-solid` | `#1B1C1E` | Panels, popovers |
| `--surface-2` | `rgba(255,255,255,.1)` | Hovers |
| `--surface-3` | `rgba(255,255,255,.14)` | Strong hover |
| `--text` | `#FFFFFF` | Primary text |
| `--text-2` | `#E6E6E6` | Secondary text |
| `--text-3` | `#9C9C9D` | Muted text |
| `--text-4` | `#6A6B6C` | Hints |
| `--accent` | `#FF6363` | Accent in dark mode |
| `--accent-soft` | `rgba(255,99,99,.14)` | Soft accent background |
| `--link` | `#FFFFFF` | Interactive emphasis |
| `--male` / `--male-ink` | `#6FA1FF` | Male indicators |
| `--female` / `--female-ink` | `#F08FB0` | Female indicators |

### Radii

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--radius-sm` | `8px` | `6px` | Controls, inputs, suggestion rows |
| `--radius-md` | `14px` | `11px` | Cards, popovers, panels |
| `--radius-lg` | `24px` | `16px` | Large panels |
| `--radius-pill` | `999px` | `999px` | Buttons, top bar, badges |
| `--radius-card` | `var(--radius-md)` | `var(--radius-md)` | Cards |
| `--radius-control` | `var(--radius-sm)` | `var(--radius-sm)` | Inputs/buttons |

### Shadows

- `--shadow-float` — top-bar and floating popovers.
- `--shadow-card` — person cards and panels.
- `--shadow-btn` — buttons.

### Typography

- **UI / body:** Inter variable, `13px`, `line-height: 1.5`, `letter-spacing: .1px`.
- **Display / brand / names:** Newsreader, `font-weight: 400`, tight tracking.
- Font stacks include system fallbacks for resilience.

## Shared components

Components live in `src/components/` and rely on `src/styles.css` classes. They are intentionally small and mostly style-driven.

- `TopBar` — floating pill-shaped shell (`top-bar`) containing brand, search, show-all, theme.
- `SearchBox` — expanding search with suggestion dropdown.
- `DetailsPanel` — right-side panel for person details, editing, and relationship management; collapses to a draggable bottom sheet on mobile.
- `AddPersonModal` — centered compact modal for creating a new person and linking them to the selected person.
- `AddRelativeModal` — one picker per relationship: create a new person or pick an existing one.
- `FollowUpPrompt` — modal checklist of possible extra links after a connection; every row starts unticked.
- `FamilyGraph` cards (`.kt-card`) — compact (`.kt-mode-compact`, 236×72 desktop / 172×64 phone: ringed avatar + two-line name + lifespan) and photo (`.kt-mode-photo`, 164×228 / 132×192: inset portrait, `.kt-accent` gender bar, Newsreader name). Main person: accent border + `--accent-soft` ring. Connectors use `--line`. Cards are opaque (`--surface-solid`) — no backdrop blur, because the starfield animates behind them.
- Top bar controls — `.icon-button` (32 px round, icon-only, label via `data-tooltip` on hover), `.view-segmented` (Focus/Family/All with a springy sliding indicator), `.card-mode-toggle` (one button whose card icon morphs landscape ↔ portrait), fit. On phones the view controls drop to a pill under the top bar. No zoom buttons.
- Sheets — People (`.people-tray.is-sheet`) and details (`.details-panel`) are full-height edge sheets on desktop (no rounded corners, `--tray-w` / `--panel-w`, zoomed 1.14–1.28× on ≥1800 px screens); the top bar recentres between them. Phones: `.people-inventory` bottom strip + bottom sheets.
- `PhotoAdjuster` — drag/keyboard focal point + zoom slider with portrait and round previews.
- `PersonFields` — shared `GenderField` (segmented Male/Female/Other with colour dots; clicking the active option clears it), `DateField` (Day · Month · Year, only the year required, stored as `YYYY`, `YYYY-MM` or `YYYY-MM-DD`) and `LifeFields` (Born, Deceased switch, Died, Resting place). Used by both Add and Edit forms.
- `Starfield` — fixed canvas behind the app; colour from `--star`.

### Gender colour system

- Tokens: `--male*`, `--female*`, `--other*` (`*` = base / `-tint` / `-ink`). **Ink & Plum** (chosen by the user): light `#3B4A7A` / `#7E4470`, dark `#A5B0D6` / `#C9A2C4`; olive-sand for Other. Avatars use solid `color-mix(var(--g) 13%, var(--surface-solid))` — never translucent tints. Photo cards: solid surface, 45% gender-mixed border, 2 px gender bar.
- Put `data-gender="M|F|X|U"` on any element; CSS sets `--g`, `--g-tint`, `--g-ink` for its avatars, rings and bars. `U` (not specified) falls back to neutral borders.
- Never print the words male/female on cards or the details panel; colour carries it.

### Dates

- Use `formatLifespan` for cards (`Born 1994`, `1921 – 2000`, `Died 2000`, `Deceased`) and `describeDates` for the panel. No ★/† symbols.
- `PersonCard` — compact person display.
- `ThemeToggle` — icon-only circular button.

### Form conventions

- Shared classes: `.form-sheet`, `.form-section` (use `.compact` for dense sections), `.form-row`, `.form-actions`, `.btn-primary`, `.btn-secondary`, `.btn-danger`.
- Required fields are marked with a discreet `*` (`.required-mark`), never the word “required”. Optional fields are simply unmarked.
- Destructive buttons (`.btn-danger`, remove/delete/discard) use `--danger` (muted brick in light, the coral accent in dark) so they match the theme.
- Non-essential fields (Chinese name, Pinyin, aliases, death details) hide behind a **More details** expander rather than a separate section or divider. No decorative section headings or dividers in compact forms.
- Photos are uploaded via the clickable avatar preview only — no URL inputs, no separate upload buttons.
- Relationship choices use pill buttons (`.relationship-option`), not raw radio inputs.
- Modals use a fixed header + scrollable body + fixed action footer; scrollbars stay inside the body.

## Motion

- Card hover: `transform .15s ease, box-shadow .15s ease`.
- Search expand: `width .18s ease`.
- Graph moves: cards and connectors tween over `520ms` with cubic in-out; new cards fade/rise in over `420ms`; camera moves use the same easing.
- Background (`--sky`, `--star`, `--nebula-1/2`, `--warp-trails`): interstellar 3D cruise — up to 460 stars projected from a vanishing point (focal 360, depth 1600, 64 units/s), glow sprites on near stars, trails only in dark mode, a pre-rendered galaxy band + nebula backdrop that drifts, pulsing flare stars, meteors. Never put `backdrop-filter` over the animated sky (it re-blurs every frame; it dropped a modal from 60 to 13 fps). Previous iteration: three parallax star layers rising at 4/9/16 px/s, pointer parallax (10/24/46 px) with spring smoothing, drifting nebula radial glows, glowing four-point stars. Previously: starlight field (~1 star per 3,200 px², capped at 460), 7% brighter stars with a soft glow sprite. Each star has a fade-in (1.6–3.2 s), hold (6–18 s) and fade-out (1.8–3.6 s) with smoothstep easing plus a gentle twinkle, drifts 1–4 px/s, and fades within 56 px of the edges. A faint meteor every 11–22 s uses a sine envelope. 30 fps; static under `prefers-reduced-motion`; paused when the tab is hidden. Colour from `--star`.
- Sheets: `kt-slide-in-left/right` (300 ms) and `kt-slide-out-left/right` (260 ms) on desktop, `kt-slide-in-up` / `kt-slide-out-down` on phones; `.is-closing` keeps the sheet mounted during the exit.
- `.busy-pill` (spinner + label, fades in after 120 ms so quick changes don't flash); `.app-notice` (≥ 44 px, 14.5 px text, pulsing dot, `pointer-events: none`); `.splash` (water-droplet ripple, 1.7 s launch / 1.1 s return).
- Invalid input: `.is-invalid` + `aria-invalid` — danger border, soft danger ring, short shake; `.field-error` message below.
- Scrollbars: thin, `color-mix(var(--text) 18%)` thumb, transparent track; `color-scheme` follows the theme.
- Sibling brackets: `.graph-link.sibling` (solid, full siblings without known parents) and `.graph-link.sibling.step` (dashed, step-siblings), drawn above the cards.
- Theme changes: instant CSS variable swap; no JS animation.
- Honor `prefers-reduced-motion` when adding new motion.

## Applying Mobbin inspiration

When using `.devin/skills/mobbin/SKILL.md`, map every insight back to the tokens above. Do not replace colors, fonts, or radii with Mobbin values. Good targets for inspiration:

- Button/input hierarchy and affordances.
- Empty, error, and loading states.
- List and dialog layout rhythm.
- Micro-interactions and transition timing.
- Navigation and search flows.
