# Fix: CI/CD Pipeline Issues (Audit #43)

This doc explains **why** the pipeline had several issues (no-op deploy, broken performance job, missing Lighthouse config, deprecated action versions), **what** we changed, and **how** to verify and extend the pipeline.

---

## 1. What was the problem?

The audit called out:

1. **Deploy step is echo (no-op)** — The "Deploy to production" step only ran `echo "🚀 Deploying..."` and a comment. It did not use the built artifact or trigger any real deployment.
2. **Performance test has wrong cd path and no DB service** — The job ran `cd MuseBar && npm ci` then `cd ../backend` (from repo root, `../backend` is wrong; backend lives at `MuseBar/backend`). The backend was started without PostgreSQL, so it would fail when connecting to the DB.
3. **Missing .lighthouserc.json** — The workflow referenced `configPath: './.lighthouserc.json'` but the file did not exist, so Lighthouse CI would fail.
4. **Deprecated GitHub Actions versions (v3 instead of v4)** — Several actions were pinned to v3 (or @master); they should use current major versions (e.g. v4 where available) to avoid deprecation and get fixes.

---

## 2. What was changed

### 2.1 Deploy step

- **Removed** the placeholder "Deploy to production" step that only echoed and had comments.
- **Added** a step **"Record deployment artifact (deploy configured elsewhere)"** that:
  - Runs only on `main`.
  - Echoes that the artifact `musebar-deployment` has been uploaded.
  - Documents that deployment is configured elsewhere (e.g. a separate job that downloads the artifact, or an external system). The build job still produces the tarball and uploads it with `actions/upload-artifact`; the new step makes it explicit that the *deploy* action is not implemented in this workflow and points operators to where to hook it.

So the deploy is still "configure elsewhere," but the pipeline no longer pretends to deploy with a no-op echo.

### 2.2 Performance test: paths and DB

- **Install paths:** Replaced the single "Install dependencies" step that did `cd MuseBar && npm ci` and `cd ../backend && npm ci` (wrong path) with two steps:
  - **Install frontend dependencies** — `working-directory: MuseBar` and `npm ci`.
  - **Install backend dependencies** — `working-directory: MuseBar/backend` and `npm ci`.
- **PostgreSQL:** Added a `postgres` service to the `performance-test` job (same image and health check as `backend-test`). The backend now has a real DB to connect to.
- **Backend env:** The step that runs migrations and the step that starts the backend now receive `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `NODE_ENV`. Added `PORT=3001` so the backend listens on 3001 and does not conflict with the frontend on 3000.
- **Frontend for Lighthouse:** The job now builds the frontend, runs migrations, starts the backend, then serves the frontend build with `npx serve -s MuseBar/build -l 3000` so Lighthouse CI has a URL to audit (`http://localhost:3000`).

### 2.3 .lighthouserc.json

- **Created** `.lighthouserc.json` at the repo root with:
  - **collect:** `url: ["http://localhost:3000"]`, `numberOfRuns: 1`.
  - **assert:** Warn-level assertions for `performance`, `accessibility`, and `best-practices` with `minScore: 0.4`.
  - **upload:** `target: "temporary-public-storage"` so the action can upload reports.

The performance job now builds and serves the frontend, starts the backend with a DB, and runs Lighthouse against the frontend.

### 2.4 Action versions (v3 → v4 / pinned)

- **actions/upload-artifact:** `@v3` → `@v4` (both in build-and-deploy and in docs job).
- **codecov/codecov-action:** `@v3` → `@v4`.
- **github/codeql-action/upload-sarif:** `@v2` → `@v3`.
- **aquasecurity/trivy-action:** `@master` → `@v1` (pinned to a major version instead of master).

Other actions already used v4 (`actions/checkout@v4`, `actions/setup-node@v4`). No change to `treosh/lighthouse-ci-action@v10`.

---

## 3. How to verify

1. **Push to a branch** and open a PR (or push to `main`/`development`). The workflow runs on push and pull_request.
2. **Deploy step:** On `main`, after "Upload deployment artifact," the "Record deployment artifact (deploy configured elsewhere)" step should run and print the artifact message. No fake "Deploying to production" echo.
3. **Performance test:** The job should:
   - Install frontend and backend deps in the correct directories.
   - Use the Postgres service for migrations and backend start.
   - Build frontend and backend, run migrations, start backend (port 3001), serve frontend (port 3000), then run Lighthouse CI with `.lighthouserc.json`. Check the job logs for any DB connection or path errors.
4. **Actions:** In the workflow file, confirm `upload-artifact@v4`, `codecov-action@v4`, `upload-sarif@v3`, and `trivy-action@v1`.

---

## 4. Summary

| Issue | Before | After |
|-------|--------|--------|
| Deploy step | echo + comment (no-op) | Explicit step documenting artifact; deploy configured elsewhere |
| Performance install | `cd MuseBar` then `cd ../backend` (wrong) | Separate steps with `working-directory: MuseBar` and `MuseBar/backend` |
| Performance DB | No Postgres | Postgres service + DB_* and JWT_SECRET env for backend |
| Performance URL | Backend only; no frontend to audit | Build frontend, serve on 3000, backend on 3001, Lighthouse on 3000 |
| .lighthouserc.json | Missing | Created at repo root with collect, assert, upload |
| upload-artifact | v3 | v4 |
| codecov-action | v3 | v4 |
| codeql upload-sarif | v2 | v3 |
| trivy-action | @master | @v1 |

The pipeline now has a correct performance job (paths, DB, frontend), a valid Lighthouse config, up-to-date action versions, and an explicit non–no-op deploy step that points to where to add real deployment.
