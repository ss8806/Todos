# 11. Testing Implementation

This chapter covers implementing backend pytest, frontend Jest, and E2E Playwright tests.

## 1. Backend Tests (pytest)

### conftest.py (Common Fixtures)

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, text

from app.main import app
from app.core.db import get_db
from app.core.config import settings
from app.models.user import User
from app.models.todo import Todo
from app.models.password_reset import PasswordResetToken
from app.core import security

# Test asynchronous engine
TEST_DATABASE_URL = settings.async_database_url

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    future=True,
)

AsyncTestingSessionLocal = sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def override_get_db():
    async with AsyncTestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="session")
async def setup_db():
    """Create tables at test session start"""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture
async def client(setup_db):
    """HTTP client for each test"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def db_session():
    """DB session for each test"""
    async with AsyncTestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def auth_headers(client) -> dict:
    """Generate headers for authenticated user"""
    user_data = {"email": "test@example.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=user_data)
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": user_data["email"], "password": user_data["password"]},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### Factory (Test Data Generation)

```python
# backend/tests/factories.py
import uuid
from polyfactory import Use
from polyfactory.factories.pydantic_factory import ModelFactory
from app.schemas.user import UserCreate


class UserCreateFactory(ModelFactory[UserCreate]):
    __model__ = UserCreate

    email = Use(lambda: f"user_{uuid.uuid4().hex[:8]}@example.com")
    password = Use(lambda: "password123")
```

### Authentication Tests

```python
# backend/tests/test_auth.py
import pytest
from tests.factories import UserCreateFactory


@pytest.mark.asyncio
async def test_register_user(client, setup_db):
    """Test user registration"""
    user_data = UserCreateFactory.build()
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == user_data.email
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_user(client, setup_db):
    """Test duplicate user registration"""
    user_data = UserCreateFactory.build(email="duplicate@example.com")
    await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )

    response = await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login(client, setup_db):
    """Test login"""
    user_data = UserCreateFactory.build(email="login@example.com")
    await client.post(
        "/api/v1/auth/register",
        json={"email": user_data.email, "password": user_data.password}
    )

    response = await client.post(
        "/api/v1/auth/token",
        data={"username": user_data.email, "password": user_data.password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client, setup_db):
    """Test login with invalid credentials"""
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "wrong@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 401
```

### Todo Tests

```python
# backend/tests/test_todos.py
import pytest
from tests.factories import UserCreateFactory


@pytest.mark.asyncio
async def test_create_todo(client, setup_db, auth_headers):
    """Test Todo creation"""
    response = await client.post(
        "/api/v1/todos/",
        json={"title": "Test task", "priority": "high"},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test task"
    assert data["priority"] == "high"


@pytest.mark.asyncio
async def test_get_todos(client, setup_db, auth_headers):
    """Test Todo list retrieval"""
    await client.post(
        "/api/v1/todos/",
        json={"title": "Task 1"},
        headers=auth_headers
    )

    response = await client.get("/api/v1/todos/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_update_todo(client, setup_db, auth_headers):
    """Test Todo update"""
    create_response = await client.post(
        "/api/v1/todos/",
        json={"title": "Before update"},
        headers=auth_headers
    )
    todo_id = create_response.json()["id"]

    response = await client.put(
        f"/api/v1/todos/{todo_id}",
        json={"title": "After update", "is_completed": True},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "After update"
    assert data["is_completed"] is True


@pytest.mark.asyncio
async def test_delete_todo(client, setup_db, auth_headers):
    """Test Todo deletion"""
    create_response = await client.post(
        "/api/v1/todos/",
        json={"title": "To be deleted"},
        headers=auth_headers
    )
    todo_id = create_response.json()["id"]

    response = await client.delete(
        f"/api/v1/todos/{todo_id}",
        headers=auth_headers
    )
    assert response.status_code == 204
```

### Running Tests

```bash
cd backend

# Run all tests
uv run pytest

# With coverage
uv run pytest --cov=app --cov-report=term-missing

# Specific file only
uv run pytest tests/test_auth.py -v
```

## 2. Frontend Tests (Jest)

### jest.config.js

```javascript
// frontend/jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
```

### jest.setup.ts

```typescript
// frontend/jest.setup.ts
import "@testing-library/jest-dom";
```

### Test Example

```tsx
// frontend/src/__tests__/theme-toggle.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("ThemeToggle", () => {
  it("displays button", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
cd frontend

# Run all tests
bun test

# Watch mode
bun test:watch

# Coverage
bun test:coverage
```

## 3. E2E Tests (Playwright)

### playwright.config.ts

```typescript
// frontend/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "cd ../backend && uv run uvicorn app.main:app --port 8000",
    url: "http://localhost:8000/health",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Page Objects

```typescript
// frontend/e2e/pages/login.page.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private page: Page) {
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### E2E Tests

```typescript
// frontend/e2e/tests/auth.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

test.describe("Authentication flow", () => {
  test("User registration and login", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Registration
    await page.goto("/register");
    await page.locator('input[type="email"]').fill(`test_${Date.now()}@example.com`);
    await page.locator('input[type="password"]').nth(0).fill("password123");
    await page.locator('input[type="password"]').nth(1).fill("password123");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/login");

    // Login
    await loginPage.login("test@example.com", "password123");
    await expect(page).toHaveURL("/");
  });
});
```

### Running E2E Tests

```bash
cd frontend

# Run tests
bun e2e

# UI mode
bun e2e:ui

# Show report
bun e2e:report
```

## Test Strategy Summary

| Type | Tool | Target | Command |
|:---|:---|:---|:---|
| Backend unit tests | pytest | API endpoints, CRUD | `uv run pytest` |
| Frontend unit tests | Jest | Components, Hooks | `bun test` |
| E2E tests | Playwright | User flow overall | `bun e2e` |

## Next Steps

Once tests are ready, let's set up automation with GitHub Actions in [Chapter 12: CI/CD](12-cicd.md).
