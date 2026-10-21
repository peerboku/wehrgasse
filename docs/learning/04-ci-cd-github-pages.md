# 04 — CI/CD: GitHub Actions and GitHub Pages

## 1. The idea

**CI (Continuous Integration)**: every time code is pushed, a fresh machine installs, builds and tests it. If it only works on your laptop, CI finds out.

**CD (Continuous Deployment)**: if CI succeeds, the result is published automatically. Deploying becomes a non-event that happens on every push, instead of a manual ritual you get wrong once a month.

Why a *fresh* machine matters: your laptop has years of leftovers (global packages, env variables, files you forgot). A clean runner has only what's in the repo, so a green run proves the repo is **complete**.

**GitHub Actions** is GitHub's CI/CD. A *workflow* is a YAML file in `.github/workflows/`. It says **when** to run (`on:`), and **what** to run (`jobs:` → `steps:`). Steps are either shell commands (`run:`) or reusable building blocks (`uses:`).

**GitHub Pages** is GitHub's free static host. With source "GitHub Actions", a workflow uploads a folder and Pages serves it.

## 2. In our app

[.github/workflows/deploy.yml](../../.github/workflows/deploy.yml), line by line:

```yaml
on:
  push:
    branches: [main]      # run on every push to main ...
  workflow_dispatch:      # ... or by hand via the "Run workflow" button

permissions:              # least privilege: this workflow may only
  contents: read          #   read the code,
  pages: write            #   publish to Pages,
  id-token: write         #   and prove its identity to Pages

concurrency:
  group: pages
  cancel-in-progress: true  # two quick pushes → only the newest deploys

jobs:
  build:
    runs-on: ubuntu-latest        # a fresh Linux VM, deleted afterwards
    steps:
      - uses: actions/checkout@v4 # copy the repo onto the VM
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm              # reuse downloads between runs (faster)
      - run: npm ci               # exact install from package-lock.json
      - run: npm run build
        env:                      # secrets → env vars, only during the build
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          ...
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist              # hand dist/ to Pages

  deploy:
    needs: build                  # only if build succeeded
    environment:
      name: github-pages
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`npm ci` instead of `npm install`: it deletes `node_modules`, installs *exactly* the lockfile, and **fails** if `package.json` and the lockfile disagree. That's what you want on CI.

**The real run** (from `gh run list` / `gh run view`):

```
completed  success  Initial commit  Deploy to GitHub Pages  main  push  39570428266  43s  2026-10-21T08:42:53Z

JOBS
✓ build in 9s
✓ deploy in 25s

ANNOTATIONS
! Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced
  to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4.
- The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026.
```

**The live site** (`curl -sI https://peerboku.github.io/wehrgasse/`):

```
HTTP/2 200
server: GitHub.com
last-modified: Wed, 21 Oct 2026 08:43:25 GMT
```

`last-modified` is 08:43:25, 32 seconds after the run started at 08:42:53. Two independent systems agree that this run produced this page.

**Warnings are evidence too.** The annotations say our action versions (`@v4`, `@v3`) are built for Node 20, which GitHub is phasing out. Today it's a warning; one day it's a failure. Noted in ROADMAP "Ideas" (update the action versions); not urgent for launch.

**Secrets timing.** `VITE_VAPID_PUBLIC_KEY` was added as a repo secret at 09:24, *after* this run (08:42). Secrets enter the app only **at build time**, so the live site doesn't contain it yet. It will after the next push. Same for the Supabase URL/key once you add them.

## 3. Predict, then run

1. Open the repo on GitHub → **Actions** → the "Initial commit" run → **build** job → expand the `npm ci` step.
2. **Predict**: about how many packages did it install? (Hint: compare with `ls node_modules | wc -l` from [chapter 01](01-scaffolding.md).)
3. Then make your next push and watch a run live with `gh run watch`.

## 4. What a pro would also do

- **Run tests and lint in CI before deploying** (`npm run test`, `npm run lint`). From Phase 1 on, `week.ts` has Vitest tests; the workflow should run them, so a broken rotation never deploys.
- **Pin action versions** (or let Dependabot update them) and treat deprecation warnings as to-dos.
- **Smoke test after deploy**: a last step that `curl`s the live URL and fails if it isn't 200. Right now *we* ran that curl; a pro makes the pipeline do it.

## 5. Sources

- GitHub Actions docs: <https://docs.github.com/en/actions>
- Workflow syntax reference: <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
- Pages with a custom workflow: <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>
- `npm ci`: <https://docs.npmjs.com/cli/commands/npm-ci>

## 6. How we know it's right

- **GitHub's runner**: build ✓, deploy ✓, on a machine that never saw our laptop.
- **HTTP**: `curl` → `200`, `server: GitHub.com`.
- **Timestamps** of the run and the page match.
- **A browser** shows the placeholder text. Open <https://peerboku.github.io/wehrgasse/> on the iPhone too.

## 7. Check yourself

1. Why does the workflow use `npm ci` instead of `npm install`?
2. You add a new GitHub secret. When does the live app see it?
3. What does `needs: build` protect against?

<details><summary>Answers</summary>

1. `npm ci` installs exactly the lockfile and fails if it's out of sync. Reproducible builds, and mistakes surface instead of being silently "fixed".
2. Only after the next build, i.e. the next push to `main` or a manual run. Secrets are baked in at build time.
3. Deploying a failed or half-finished build. Deploy only runs if build succeeded, so the old version stays live otherwise.

</details>

## 8. Your notes

> _What would happen if two flatmates had push access and both pushed within 10 seconds? (Hint: `concurrency`.)_
>
>
