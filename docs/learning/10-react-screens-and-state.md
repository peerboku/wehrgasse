# 10 — React screens, state, and a prototype on fake data

## 1. The idea

A React app is a tree of **components**: functions that take **props** (inputs) and return what should be on screen. When something changes, you don't edit the screen yourself. You change **state** (`useState`), and React redraws whatever depends on it.

Two habits keep this simple:

- **State lives as high as needed, as low as possible.** Things several screens need (who's logged in, the list of assignments) live in `App`. Things only one screen needs (is the confirm sheet open?) live in that screen.
- **Data flows down, events flow up.** `App` passes `assignments` down as a prop. A screen never changes them itself; it calls a function it got as a prop (`onMarkDone(id)`), and `App` updates the state.

A **clickable prototype on fake ("mock") data** lets real people test the real screens before any backend exists. Done well, switching to the real backend later only changes *where the data comes from*, not the screens.

## 2. In our app

**Structure** (all new in Phase 1):

| File | Job |
|---|---|
| [src/App.tsx](../../src/App.tsx) | holds state: logged-in member, active tab, assignments; decides which screen to show |
| [src/screens/](../../src/screens/) | `Login`, `MyWeek`, `Overview`, `Settings` |
| [src/components/](../../src/components/) | `TabBar`, `ConfirmSheet`, `Celebration`, `Button`, `Avatar` |
| [src/lib/types.ts](../../src/lib/types.ts) | data shapes, **field names = future DB columns** (`week_start`, `done_at`) |
| [src/lib/mockData.ts](../../src/lib/mockData.ts) | fake members, chores, rotation, assignments |
| [src/lib/events.ts](../../src/lib/events.ts) | `logEvent()`, for now only `console.info` |
| [src/lib/strings.ts](../../src/lib/strings.ts) | every German word on screen |

**No router.** The tab is just state: `const [tab, setTab] = useState<Tab>('myWeek')`, and `App` shows `{tab === 'overview' && <Overview … />}`. That's ADR [0002](../decisions/0002-github-pages-and-hashrouter.md) in practice.

**Marking done**, the core loop, step by step:

1. `MyWeek`: tap "Erledigt" → `setConfirming(assignment)` → the `ConfirmSheet` appears.
2. "Ja klar!" → `onMarkDone(id)`, a prop from `App`.
3. `App.markDone()` sets `done_at` on that one assignment (a *new* array, never changing the old one) and calls `logEvent('chore_done', …)`.
4. React redraws: the card turns green ("Erledigt am Mi. ✅"), the Overview shows "erledigt Mi.", and `Celebration` plays for 1.6 s.

**Mock data on purpose:** last week Peer and Noa are **overdue**, Carla and Manu are done, so the hallway test shows both states. This week everything is open, so every tester can do task 3 ("Markier es als erledigt"). A reload resets everything.

**Events from day 1:** the real browser console during our click-through:

```
[event] app_open {}
[event] login {member_id: peer}
[event] chore_done {assignment_id: 2026-10-19-bath-cp}
```

In Phase 3 only the inside of `logEvent()` changes (insert into `events`); the calls stay.

**Styling:** CSS Modules + colour tokens with a dark-mode set ([ADR 0006](../decisions/0006-css-modules.md)). iPhone details: `env(safe-area-inset-*)` paddings so nothing hides under the notch or home bar, inputs at 17px so iOS doesn't zoom in, and `prefers-reduced-motion` turns off the confetti.

**How we checked it:** we installed Playwright with WebKit (Safari's engine) in a scratch folder, not in the project, and let a script click through all screens in iPhone 15 size, light and dark, taking screenshots.

**Mistake (false alarm):** in the screenshots the notifications switch looked *off* after being tapped. A second script read the real state: `before false → after tap true → after label tap false`. The switch worked; the screenshot was taken during its 0.2 s slide animation. Lesson: check the *state*, not only the picture.

## 3. Predict, then run

In [src/screens/MyWeek.tsx](../../src/screens/MyWeek.tsx), `finishCelebration` is wrapped in `useCallback`. **Predict**: what would happen to the confetti if you removed `useCallback` (plain `() => setCelebrating(false)`) and tapped "Erledigt"? Try it in `npm run dev`, then undo it. (Hint: `Celebration`'s `useEffect` restarts its timer whenever `onFinished` is a *new* function.)

## 4. What a pro would also do

- **Component tests** (React Testing Library) for "tap Erledigt → sheet → done". We test the risky logic (`week.ts`) and use the hallway test for the UI.
- **A data layer / hook** (`useAssignments()`) so screens don't know whether data is mock or real. Will come naturally in Phase 3.
- **Accessibility pass** with VoiceOver on the iPhone. We used real `<button>`s, `role="dialog"`, `role="switch"`, and labels, which covers most of it.

## 5. Sources

- React docs, "Thinking in React" (where state should live): <https://react.dev/learn/thinking-in-react>
- React docs, `useState`, `useEffect`, `useCallback`: <https://react.dev/reference/react>
- Vite, CSS Modules: <https://vite.dev/guide/features#css-modules>
- WebKit, designing for iPhone X safe areas (`env(safe-area-inset-*)`): <https://webkit.org/blog/7929/designing-websites-for-iphone-x/>
- Apple HIG, sheets and tab bars: <https://developer.apple.com/design/human-interface-guidelines/>

## 6. How we know it's right

- `npm run build` (includes the TypeScript check) and `npm run lint` pass with no errors.
- WebKit screenshots in light and dark: login → MyWeek → confirm → celebration → Overview shows "erledigt Mi.". The console shows the 3 expected events.
- **The real judges:** Carla, Noa and Manu in the hallway test (Phase 2), on their own iPhones.

## 7. Check yourself

1. Why does `MyWeek` call `onMarkDone()` instead of changing the assignment itself?
2. Which file changes in Phase 3 so events go to the database, and which files *don't*?
3. Why do the fields in `types.ts` use `snake_case` while the rest of the code uses `camelCase`?

<details><summary>Answers</summary>

1. The assignments live in `App` (Overview needs them too). Data flows down, events flow up: one owner of the data means both screens always agree.
2. Only `src/lib/events.ts`. The screens and `App` keep calling `logEvent()` unchanged.
3. They mirror the Postgres column names, so Supabase rows fit without renaming.

</details>

## 8. Your notes

> _Draw the path of one tap on "Erledigt" through the files, in your own words._
>
>
