# 03. Project Initialization and Directory Structure

This chapter covers initializing the backend and frontend projects and creating the necessary configuration files.

## Overall Directory Structure

First, create the following directory structure in the project root:

```bash
mkdir -p Todo
cd Todo
mkdir -p backend frontend docker docs
```

Final structure:

```
Todo/
├── backend/            # FastAPI project
│   ├── app/
│   ├── migrations/
│   └── tests/
├── frontend/           # Next.js project
│   └── src/
├── docker/             # Dockerfile
├── docker-compose.yml
├── justfile
├── .env
└── .env.example
```

## 1. Backend Initialization

### Create project with uv

```bash
cd backend
uv init --python 3.10
```

`pyproject.toml` will be generated. Add dependencies:

```bash
uv add fastapi sqlmodel asyncpg uvicorn python-jose[cryptography] passlib \
  argon2-cffi pydantic-settings python-multipart scalar-fastapi slowapi \
  python-json-logger alembic fastapi-mail jinja2 greenlet

uv add --dev pytest pytest-asyncio httpx pytest-cov psycopg2-binary polyfactory
```

### Create backend directory structure

```bash
mkdir -p app/api/api_v1/endpoints
mkdir -p app/core
mkdir -p app/crud
mkdir -p app/middleware
mkdir -p app/models
mkdir -p app/schemas
mkdir -p app/templates/email
mkdir -p migrations/versions
mkdir -p tests
```

Role of each directory:

| Directory | Role |
|:---|:---|
| `app/api/` | API routers and endpoints |
| `app/core/` | Core features like config, security, DB connection |
| `app/crud/` | Database CRUD operations |
| `app/middleware/` | Custom middleware (logging, error handling) |
| `app/models/` | SQLModel database models |
| `app/schemas/` | Pydantic schemas (request/response type definitions) |
| `app/templates/email/` | Email templates |
| `migrations/` | Alembic DB migrations |
| `tests/` | pytest test code |

### Create each `__init__.py`

```bash
touch app/__init__.py
touch app/api/__init__.py
touch app/api/api_v1/__init__.py
touch app/api/api_v1/endpoints/__init__.py
touch app/core/__init__.py
touch app/crud/__init__.py
touch app/middleware/__init__.py
touch app/models/__init__.py
touch app/schemas/__init__.py
```

## 2. Frontend Initialization

### Create Next.js project with Bun

```bash
cd ../frontend
bun create next-app@latest . --typescript --tailwind --eslint --app --src-dir
```

Option descriptions:
- `--typescript`: Use TypeScript
- `--tailwind`: Install Tailwind CSS
- `--eslint`: Configure ESLint
- `--app`: Use App Router
- `--src-dir`: Use `src/` directory

### Initialize shadcn/ui

```bash
bunx shadcn@latest init
```

Interactive setup will begin. Please select as follows:

- **Style**: `New York`
- **Base color**: `Zinc`
- **CSS variables**: `yes`

### Install required components

```bash
bunx shadcn@latest add button input card badge checkbox select label dialog
```

### Additional frontend dependencies

```bash
bun add @tanstack/react-query @tanstack/react-query-devtools \
  react-hook-form @hookform/resolvers zod sonner next-themes \
  lucide-react clsx tailwind-merge class-variance-authority

bun add -D @testing-library/react @testing-library/jest-dom \
  @testing-library/react-hooks @types/jest jest jest-environment-jsdom \
  ts-jest @playwright/test playwright
```

## 3. Create Common Configuration Files

### docker-compose.yml

Create in the project root:

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=tododb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mailpit:
    image: axllent/mailpit:latest
    restart: always
    ports:
      - "8025:8025"
      - "1025:1025"
    volumes:
      - mailpit_data:/data
    environment:
      - MP_MAX_MESSAGES=5000
      - MP_DATA_FILE=/data/mailpit.db

volumes:
  postgres_data:
  mailpit_data:
```

### justfile

Create in the project root:

```just
# Start DB only with Docker
up:
    docker compose up -d

# Start development environment (DB, Backend, Frontend all in one terminal)
dev:
    @just up
    @echo "Starting backend and frontend..."
    cd frontend && bunx concurrently \
        -n "Backend,Frontend" \
        -c "cyan,magenta" \
        "cd ../backend && uv run uvicorn app.main:app --reload" \
        "bun dev"

# Show database logs
db-logs:
    docker compose logs -f db

# Local development: start backend (uv)
backend-dev:
    cd backend && uv run uvicorn app.main:app --reload

# Local development: start frontend (bun)
frontend-dev:
    cd frontend && bun dev

# Reset database state (volumes also deleted)
clean-db:
    docker compose down -v
    docker compose up -d db

# Apply Alembic migrations
db-migrate:
    cd backend && uv run alembic upgrade head

# Create new Alembic migration file
db-revision:
    @if [ -z "$MESSAGE" ]; then \
        echo "Usage: just db-revision MESSAGE=\"description\""; \
        exit 1; \
    fi
    cd backend && uv run alembic revision --autogenerate -m "$MESSAGE"

# Check project status
status:
    docker compose ps
```

### .env.example

Create a template in the project root:

```env
# Execution environment (development / production)
ENVIRONMENT=development

# Database settings
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_SERVER=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=tododb

# JWT settings
SECRET_KEY=change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS settings
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# Rate limit settings
RATE_LIMIT_DEFAULT=100/minute
RATE_LIMIT_LOGIN=5/minute
RATE_LIMIT_REGISTER=5/minute

# Email settings (use Mailpit in development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_TLS=false
SMTP_SSL=false
MAIL_FROM=noreply@todoapp.dev

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Password reset token expiration (hours)
RESET_TOKEN_EXPIRE_HOURS=24
```

## 4. Prepare Entry Points

### Backend entry point

Create `backend/main.py` (simple entry point for development):

```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

`backend/app/main.py` will be implemented in detail in subsequent chapters.

### Verify frontend development server

```bash
cd frontend
bun dev
```

Access `http://localhost:3000` in your browser and verify that the Next.js initial screen is displayed.

## Next Steps

Once the project is initialized, let's implement the database model and connection settings using SQLModel in [Chapter 04: Database Layer](04-backend-database.md).
