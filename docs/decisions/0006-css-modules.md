# 0006 — Styling with CSS Modules + design tokens

**Status:** Accepted, 2026-10-21

## Context
Phase 1 builds 4 screens and ~5 components that must look good on iPhone in light and dark mode. CLAUDE.md allows plain CSS or CSS modules, no framework required. The code should stay readable for a beginner.

Alternatives considered:
- **One global CSS file**: simplest to start, but class names collide as it grows (`.card` on two screens), and nobody knows which rule is still used.
- **Tailwind**: fast once learned, but a new vocabulary (`px-4 rounded-2xl`) inside every component and extra build setup.
- **CSS-in-JS** (styled-components etc.): extra dependency and runtime cost, mixes two languages in one file.

## Decision
- **CSS Modules**: every screen/component has a `Name.module.css` next to it, used as `styles.card`. Vite supports this out of the box; class names are made unique automatically.
- **Design tokens** (colours, radius, spacing) as CSS variables in `src/index.css`, redefined in `@media (prefers-color-scheme: dark)`. Dark mode is just a second set of token values.

## Consequences
- ➕ Plain CSS syntax, which transfers to any web project.
- ➕ Delete a component, and its styles go with it.
- ➕ One place to change colours for the whole app.
- ➖ Shared looks need a component (e.g. `Button`) instead of a global class.
- ➖ Two files per component.
