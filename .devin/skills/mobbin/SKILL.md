---
name: mobbin
description: Search Mobbin for UX/flow/pattern inspiration and apply it within Ka-teng’s existing design system
triggers:
  - user
allowed-tools:
  - read
  - grep
  - edit
  - mcp_call_tool
permissions:
  allow:
    - Read(src/components/**)
    - Read(src/renderer/**)
    - Read(src/theme/**)
    - Read(src/styles.css)
    - Read(docs/DESIGN_SYSTEM.md)
    - Write(src/components/**)
    - Write(src/renderer/**)
    - Write(src/styles.css)
---

Use Mobbin as a reference for better user flows, motion, button patterns, empty states, lists, dialogs, nav, and component micro-interactions. Ka-teng already has its own design system; do not replace colors, fonts, or radii. Map every Mobbin insight back to the existing tokens and shared components.

Prerequisite: the user must have run `devin mcp login mobbin` at least once.

Steps:
1. Ask the user which screen, component, flow, or pattern needs inspiration (e.g., “settings page,” “media player controls,” “empty state,” “card list,” “onboarding flow,” “button hierarchy,” “transitions”).
2. Use `mcp_call_tool` with `server_name: mobbin`:
   - `search_screens` for single-screen references.
   - `search_flows` for multi-step interactions.
   - `search_sections` for page/section references.
3. Summarize the 2–4 most relevant results. Focus on:
   - Layout and information hierarchy
   - Spacing and rhythm
   - Button/input hierarchy and affordances
   - Motion and transition timing
   - Empty/error/loading states
   - Component patterns
4. Map the inspiration to Ka-teng’s existing system:
   - Use the project’s design tokens (colors, radii, spacing, typography, shadows) from `src/theme/tokens.css`.
   - Reuse existing shared components in `src/components/`; only add a new primitive if a clear gap exists and it fits the existing library.
   - Preserve the existing nav structure and shell conventions.
5. If the user wants a concrete change, implement it in the relevant React/TSX files and `src/styles.css`. Add/adjust motion with CSS transitions, but honor `prefers-reduced-motion`.
6. After changes, run the frontend checks and report failures:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

When describing results, emphasize patterns that are feasible in React + Vite and consistent with Ka-teng’s shell.
