# 18 — A new look: design tokens, CSS variables per element, and a wheel made of trigonometry

## 1. The idea

**Design tokens.** A design is mostly a short list of decisions: these 12 colours, these 4 radii, this spacing scale. If every CSS file uses those names (`var(--primary)`) instead of raw values (`#ff9a3d`), then:
- a redesign = swapping one file (`index.css`), not hunting through 15;
- dark mode = redefining the same names inside `@media (prefers-color-scheme: dark)`. No module needs to know dark mode exists.

**CSS custom properties can be set per element.** `style={{ '--member': '#7a6ff0' }}` on one avatar makes `var(--member)` mean purple *inside that element only*. The CSS stays static ("tint with the member colour"), React only hands in the value. Same trick for positions (`--x`, `--y`) and angles (`--angle`).

**`color-mix()`** mixes two colours in CSS: `color-mix(in srgb, #7a6ff0 16%, transparent)` = the member colour at 16 % strength. Because `16%` itself is a token (`--tint-pct`, 26 % in dark mode), tints get stronger on a dark background without any JavaScript.

**A circle is just sine and cosine.** Slot *i* of *n* sits at angle `i · 360/n` (0 = top, clockwise). On a square from 0 % to 100 %, with the centre at 50 % and radius 32 %:

```
x = 50 + 32 · sin(angle)      y = 50 − 32 · cos(angle)
```

(minus for y because screen y grows downwards.) The coloured slices are one `conic-gradient`: a gradient that runs *around* a point instead of across a box.

## 2. In our app

The design itself came as a handoff package from claude.ai design: [`docs/wg-app-design3-handoff/`](../wg-app-design3-handoff/HANDOFF.md). Why Design 3 and the choices around it: [ADR 0012](../decisions/0012-design-3-knautsch-drehscheibe.md).

| File | What changed |
|---|---|
| [`src/index.css`](../../src/index.css) | Replaced: all tokens, light + dark. Keeps the old names (`--text`, `--surface` …) as aliases |
| [`src/components/Icons.tsx`](../../src/components/Icons.tsx) | New: line icons as small components, colour via `stroke="currentColor"` |
| [`src/components/Button.tsx`](../../src/components/Button.tsx) | Variant `done` (green "Ja klar!"); unused `danger` removed |
| [`src/components/ConfirmSheet.tsx`](../../src/components/ConfirmSheet.tsx) | Optional `icon` tile and `yesVariant` |
| [`src/components/Celebration.tsx`](../../src/components/Celebration.tsx) | Coloured confetti via `--color`, cheer as a pill in the button slot |
| [`src/components/Avatar.tsx`](../../src/components/Avatar.tsx) | Tint via `color-mix`; `tint={false}` where the wrapper already paints it |
| [`src/screens/MyWeek.tsx`](../../src/screens/MyWeek.tsx) | Header with avatar → Einstellungen, hero card, WG strip → WG tab, "Ab Montag:", fixed Erledigt button |
| [`src/screens/Overview.tsx`](../../src/screens/Overview.tsx) | The wheel (`Wheel` component), "Zuletzt erledigt" card, "Ab Montag" card |
| [`src/screens/Settings.tsx`](../../src/screens/Settings.tsx) | Grouped list, install steps behind a disclosure row |
| [`src/lib/week.ts`](../../src/lib/week.ts) + [`data.ts`](../../src/lib/data.ts) | `rotationForWeek()` (tested) + `loadRotation()` for "Ab Montag" |

**The wheel in code** ([`Overview.tsx`](../../src/screens/Overview.tsx), `Wheel`):

```ts
const step = 360 / n
const slices = slots.map((a, i) => `${tint} ${i * step}deg ${(i + 1) * step}deg`)
const wheelBg = `conic-gradient(from ${-step / 2}deg, ${slices.join(', ')}), var(--card)`
```

`from -45deg` (for n = 4) turns the gradient back by half a slice, so slice 0 is *centred* on the top instead of starting there. Before building it, the list is rotated so *my* chore is slot 0, right under the orange pointer.

**Mistakes on the way (real output):**

1. Removing strings first, then fixing the screens. `npx tsc -b` listed every place still using a removed string:
   ```
   src/screens/Overview.tsx(35,49): error TS2339: Property 'deadline' does not exist on type '{ appName: string; ...
   src/screens/Settings.tsx(91,60): error TS2551: Property 'notificationsTitle' does not exist ... Did you mean 'notificationsToggle'?
   ```
   That's TypeScript as a to-do list: delete first, let the compiler find the users.
2. The first `Icons.tsx` built icons with a factory function (`makeIcon(<path …/>)`). The linter warned:
   ```
   src/components/Icons.tsx:13:19: warning react(only-export-components): Fast refresh only works when a file only exports components.
   ```
   Rewritten as one plain function component per icon: longer, but obvious and lint-clean.
3. Checking the screens without logging in: a throwaway preview page outside the repo rendered the real screens with the test data from `mockData.ts` and fake Supabase keys, screenshotted by Playwright in WebKit (Safari's engine) at 390 × 844 and 375 × 667, light + dark. Three small stumbles: the Vite config outside the repo couldn't `import 'vite'` (`Error: Cannot find module 'vite'`, so it became a plain object); `mouse.wheel: Mouse wheel is not supported in mobile WebKit` (scrolled with `window.scrollTo` instead); and the Settings chevron looked unrotated because the screenshot was taken during its 0.2 s transition (waiting 500 ms showed it rotated).

## 3. Predict, then run

In Safari on the Mac, open the app, then the Web Inspector (Develop → Show Web Inspector). Select the `<html>` element and add `--tint-pct: 60%` in its style.

Write down first: which parts of the WG tab change, and which stay the same? Then try it. Then try `--primary: hotpink`.

## 4. What a pro would also do

- **Visual regression tests**: screenshots in CI compared to approved ones, so a CSS change that breaks another screen gets caught. Worth it for a team; for us the iPhone check is enough.
- **A Storybook / preview page in the repo** for every component state (done, overdue, two chores). We used a throwaway one in a temp folder; if the design keeps changing, it could move into the repo.
- **Automated accessibility checks** (axe) in CI. We checked touch targets with a small script once (all ≥ 44 px, except the switch, which sits inside a 56 px label row).

## 5. Sources

- MDN: [Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) (inheritance, setting them per element)
- MDN: [`conic-gradient()`](https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient) and [`color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
- MDN: [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme), [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- W3C Design Tokens Community Group: [what a design token is](https://www.designtokens.org/)
- Apple HIG: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (44 pt touch targets, safe areas)

## 6. How we know it's right

- **Machines (27.10.):** `npm run lint` (no findings), `npx tsc -b` (no errors), `npm run test` (**23/23**: the 20 old ones plus 3 for `rotationForWeek`, e.g. "in the anchor week, next week is cycle week 1" against the CLAUDE.md table).
- **WebKit screenshots (27.10.):** all three screens in light + dark, confirm sheet, take-over sheet, done state, celebration, two chores + overdue, 375 × 667. No page errors.
- ⏳ **Peer on the iPhone:** the review checklist in [ROADMAP.md](../../ROADMAP.md) under "New design". Safe areas, Home Screen mode, real photos and Dynamic Type can't be checked in the emulator.

## 7. Check yourself

1. Why does dark mode need no change in `Overview.module.css`?
2. With 5 chores, at which angle does slot 2 sit, and roughly where (x %, y %)?
3. Why is "Ab Montag" read from `rotation_template` and not from `assignments`?

<details><summary>Answers</summary>

1. The module only uses tokens (`var(--card)`, `var(--tint-pct)` …). `index.css` gives those tokens other values under `prefers-color-scheme: dark`.
2. 2 · 360/5 = 144°. x = 50 + 32 · sin 144° ≈ 50 + 18.8 = 68.8 %, y = 50 − 32 · cos 144° ≈ 50 + 25.9 = 75.9 %: bottom right.
3. Next week's assignment rows don't exist yet (`ensure_week()` only creates the current week), and take-overs only change this week, so the template is exactly what next week will be.

</details>

## 8. Your notes

> _Explain to Carla why changing one colour in `index.css` can recolour the whole app, but changing it in `MyWeek.module.css` can't:_
>
>
