# 01 — Scaffolding a frontend project

## 1. The idea

**Scaffolding** means generating the boring starting files of a project with a tool, instead of writing them by hand. A modern frontend project needs a dozen config files that are the same everywhere; a generator gets them right.

The pieces:

- **Node.js**: runs JavaScript outside the browser. We need it for the *tools* (build, dev server, tests), not for the app itself, which runs in the browser.
- **npm**: Node's package manager. It downloads libraries ("packages") other people wrote.
- **`package.json`**: the project's ID card. Name, the scripts you can run (`npm run dev`), and the packages it needs, with allowed version ranges.
- **`package-lock.json`**: the *exact* versions npm actually installed, including the packages of the packages. Commit it, so every machine (and GitHub Actions) installs the identical set.
- **`node_modules/`**: the downloaded packages. Huge and re-creatable from the lockfile, so it is **never** committed.
- **Vite**: the dev server (instant reload while you edit) and the bundler (turns your code into optimized files for production).
- **React**: a library for building UIs from components: functions that return what should be on screen.
- **TypeScript**: JavaScript plus types. The compiler catches mistakes like passing a number where a name is expected *before* the app runs.

Version ranges in `package.json`: `^19.3.1` means "19.x.x, at least 19.3.1" (no breaking major update); `~6.0.3` means "6.0.x only". This is **semantic versioning**: MAJOR.MINOR.PATCH, where a MAJOR bump may break things.

The most important skill with a generator is **deleting**: it gives you a demo, and you keep only what you understand and need.

## 2. In our app

We ran the official generator with the React + TypeScript template:

```sh
npm create vite@latest scaffold -- --template react-ts --no-interactive
```

The generator expects an empty folder, and ours already had `CLAUDE.md`, `ROADMAP.md` and `docs/`. So we generated into a temporary folder and copied over only what we wanted. The resulting dependency list:

```json
"dependencies":    { "react": "^19.3.1", "react-dom": "^19.3.1" },
"devDependencies": { "typescript": "~6.0.3", "vite": "^8.3.4",
                     "@vitejs/plugin-react": "^6.1.2", "oxlint": "^1.88.0", ... }
```

`dependencies` ship to the browser; `devDependencies` are only tools for building and checking.

**What the generator produced vs. what we kept:**

| File | Fate | Why |
|---|---|---|
| `tsconfig*.json`, `.oxlintrc.json`, `src/main.tsx`, `public/favicon.svg` | kept as is | standard config / entry point |
| `package.json` | kept, renamed `scaffold` → `wehrgasse` | |
| `index.html` | kept, `lang="de"`, title `WG-App` | UI is German; screen readers use `lang` |
| `vite.config.ts` | kept, added `base: '/wehrgasse/'` | see [chapter 02](02-build-and-base-path.md) |
| `.gitignore` | rewritten | added secrets rules, see [chapter 05](05-secrets-and-config.md) |
| `src/App.tsx`, `src/index.css` | replaced | demo counter → one placeholder page with dark mode |
| `src/App.css`, `src/assets/*` (hero.png, react.svg, vite.svg), `public/icons.svg`, `README.md` | **deleted** | demo material we don't use |
| `src/lib/strings.ts` | **new** | rule from CLAUDE.md: all German UI text in one place |

Our whole app at this point, [src/App.tsx](../../src/App.tsx):

```tsx
import { strings } from './lib/strings'

function App() {
  return (
    <main className="placeholder">
      <h1>{strings.appName}</h1>
      <p>{strings.comingSoon}</p>
    </main>
  )
}
```

Then `npm install` read `package.json`, wrote `package-lock.json` (1349 lines in our first commit) and filled `node_modules/`.

## 3. Predict, then run

Predict: how many folders are inside `node_modules/` right now: about 5, 30, or 300? Then run:

```sh
ls node_modules | wc -l
```

Now predict which of our 2 listed `dependencies` pulled in the most. (Hint: `npm ls --all | head -40`.)

## 4. What a pro would also do

- **Pin the Node version** for everyone (an `.nvmrc` file or `"engines"` in `package.json`), so laptop and GitHub Actions use the same Node. We set Node 24 only in the workflow.
- **Run the linter in CI** (`npm run lint`, oxlint is already installed) so style problems fail the pipeline, not a code review.
- **Turn on Dependabot** so GitHub opens a pull request when a package has a security fix.
- We skip these for now: 4 users, 5 days to launch. Logged in ROADMAP "Ideas" if they become relevant.

## 5. Sources

- Vite guide (scaffolding, dev server): <https://vite.dev/guide/>
- `package.json` reference: <https://docs.npmjs.com/cli/configuring-npm/package-json>
- `package-lock.json`: <https://docs.npmjs.com/cli/configuring-npm/package-lock-json>
- Semantic versioning: <https://semver.org>
- React, "Your first component": <https://react.dev/learn/your-first-component>
- TypeScript handbook: <https://www.typescriptlang.org/docs/handbook/intro.html>

## 6. How we know it's right

- **The TypeScript compiler**: `npm run build` runs `tsc -b` first and would stop on any type error. It passed (see [chapter 02](02-build-and-base-path.md)).
- **npm itself**: `npm install` ended with `found 0 vulnerabilities`.
- **GitHub Actions** ran `npm ci` on a clean Linux machine from only the lockfile, and it succeeded. That proves the lockfile is complete (see [chapter 04](04-ci-cd-github-pages.md)).

## 7. Check yourself

1. Why do we commit `package-lock.json` but not `node_modules/`?
2. Is `react` 20.0.0 allowed by `"react": "^19.3.1"`?
3. Why put the German text in `strings.ts` instead of directly in `App.tsx`?

<details><summary>Answers</summary>

1. The lockfile is small and fully describes the exact versions; `node_modules` is huge and can be rebuilt from the lockfile with `npm ci`.
2. No. `^` allows minor and patch updates but not a new major version, which may contain breaking changes.
3. So the wording can be changed in one place without hunting through components, and so all UI text is reviewed together (no accidental English, like Flatastic's activity feed, see [chapter 08](08-ux-reference.md)).

</details>

## 8. Your notes

> _What's the difference between `npm install` and `npm ci`? (Look it up, then explain in one sentence.)_
- 'npm install' installs all modules. 
- 'npm ci' only installs the packages defined in 'package.json'

Use npm install during active local development when adding or upgrading packages, and switch to npm ci for all build, test, and production environments to guarantee consistency and speed. 