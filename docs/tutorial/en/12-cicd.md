# 12. CI/CD Configuration

This chapter explains how to automate testing, building, and deployment using GitHub Actions.

## 1. CI Workflow

Create `.github/workflows/ci.yml`.

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: tododb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3
        with:
          version: "latest"

      - name: Set up Python
        run: uv python install 3.10

      - name: Install dependencies
        run: |
          cd backend
          uv sync --all-groups

      - name: Run Alembic migrations
        run: |
          cd backend
          uv run alembic upgrade head
        env:
          SECRET_KEY: test-secret-key
          POSTGRES_SERVER: localhost

      - name: Run backend tests
        run: |
          cd backend
          uv run pytest --cov=app --cov-report=xml
        env:
          SECRET_KEY: test-secret-key
          POSTGRES_SERVER: localhost

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage.xml
          flags: backend

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: |
          cd frontend
          bun install

      - name: Run lint
        run: |
          cd frontend
          bun lint

      - name: Run tests
        run: |
          cd frontend
          bun test --coverage

      - name: Build
        run: |
          cd frontend
          bun run build
```

## 2. E2E Test Workflow

Create `.github/workflows/e2e-tests.yml`.

```yaml
name: E2E Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: password
          POSTGRES_DB: tododb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install backend dependencies
        run: |
          cd backend
          uv sync --all-groups

      - name: Install frontend dependencies
        run: |
          cd frontend
          bun install

      - name: Install Playwright
        run: |
          cd frontend
          bunx playwright install --with-deps chromium

      - name: Start backend
        run: |
          cd backend
          uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
        env:
          SECRET_KEY: test-secret-key
          POSTGRES_SERVER: localhost

      - name: Wait for backend
        run: |
          sleep 5
          curl --retry 10 --retry-delay 2 http://localhost:8000/health

      - name: Run E2E tests
        run: |
          cd frontend
          bun e2e
        env:
          CI: true

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

## 3. Workflow Explanation

### CI Workflow (ci.yml)

| Job | Content |
|:---|:---|
| `backend-test` | Backend test execution, coverage measurement |
| `frontend-test` | Frontend lint, test, build |

### E2E Workflow (e2e-tests.yml)

| Step | Content |
|:---|:---|
| Start services | Start PostgreSQL container |
| Install dependencies | uv, Bun, Playwright |
| Start backend | Start FastAPI server in background |
| Run E2E tests | Browser tests with Playwright |
| Save report | Save failure screenshots as artifacts |

## 4. Local CI Reproduction

You can use [act](https://github.com/nektos/act) to reproduce the same environment as GitHub Actions locally:

```bash
# Install act
brew install act

# Run CI workflow locally
act -j backend-test
```

## 5. Badge Configuration

Add CI status badges to README.md:

```markdown
# Todo Application

![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)
```

## Summary

This completes the Todo application tutorial. The following features have been implemented:

- **Backend**: REST API with FastAPI + SQLModel + PostgreSQL
- **Authentication**: JWT-based user authentication (registration/login/password reset)
- **Frontend**: Modern UI with Next.js + shadcn/ui
- **Testing**: Multi-layer testing with pytest + Jest + Playwright
- **CI/CD**: Automation with GitHub Actions

## Next Steps (Advanced Topics)

- **Performance optimization**: Frontend build optimization, backend query optimization (N+1 problem countermeasures)
- **Additional features**: Todo categorization, reminder feature, sharing feature
- **Observability**: Add trace IDs to structured logs to improve request traceability
- **Production deployment**: Deploy to Vercel (frontend) + Railway/Render (backend)

---

Thank you for your hard work! We hope this tutorial helps you learn modern web development.
