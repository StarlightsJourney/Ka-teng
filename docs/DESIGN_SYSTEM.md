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
- `DetailsPanel` — right-side panel for person details, editing, and relationship management.
- `AddPersonModal` — centered modal for creating a new person and linking them to the selected person.
- `PersonCard` — compact person display.
- `ThemeToggle` — icon-only circular button.

## Motion

- Card hover: `transform .15s ease, box-shadow .15s ease`.
- Search expand: `width .18s ease`.
- Chart transitions: `family-chart` internal transition time set to `650ms`.
- Theme changes: instant CSS variable swap; no JS animation.
- Honor `prefers-reduced-motion` when adding new motion.

## Applying Mobbin inspiration

When using `.devin/skills/mobbin/SKILL.md`, map every insight back to the tokens above. Do not replace colors, fonts, or radii with Mobbin values. Good targets for inspiration:

- Button/input hierarchy and affordances.
- Empty, error, and loading states.
- List and dialog layout rhythm.
- Micro-interactions and transition timing.
- Navigation and search flows.
