# Todo App Tutorial

## Introduction

In this tutorial, you will learn how to build a Todo application from scratch using modern web development technologies.

This project is designed for learning and portfolio purposes, and adopts the following technology stack:

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + SQLModel + PostgreSQL (asyncpg)
- **Authentication**: JWT (python-jose) + OAuth2
- **Testing**: pytest (Backend) + Jest (Frontend) + Playwright (E2E)
- **Infrastructure**: Docker Compose + GitHub Actions (CI/CD)

## Tutorial Structure

Each chapter can be read independently, but we recommend following them in order if this is your first time.

| Chapter | Title | Content |
|:---|:---|:---|
| [01](01-introduction.md) | Technology Stack Overview | Overview of adopted technologies and selection rationale |
| [02](02-environment-setup.md) | Environment Setup | Docker, uv, Bun, just setup |
| [03](03-project-init.md) | Project Initialization | Directory structure and configuration files |
| [04](04-backend-database.md) | Database Layer | SQLModel models, DB connection, Alembic migrations |
| [05](05-backend-auth.md) | Authentication | JWT authentication, user registration/login/password reset |
| [06](06-backend-todo-api.md) | Todo API | CRUD operations, search/filter/pagination |
| [07](07-backend-middleware.md) | Middleware | Logging, error handling, rate limiting |
| [08](08-frontend-setup.md) | Frontend Foundation | Next.js initialization, shadcn/ui, API client |
| [09](09-frontend-auth.md) | Authentication UI | Login/register/password reset screens |
| [10](10-frontend-todo.md) | Todo Management | List view, add, edit, filter, pagination |
| [11](11-testing.md) | Testing | Backend/frontend/E2E tests |
| [12](12-cicd.md) | CI/CD | Automated testing and building with GitHub Actions |

## Prerequisites

- macOS / Linux environment (WSL2 also supported)
- Docker Desktop installed
- Basic knowledge of terminal operations
- Basic understanding of Python and JavaScript/TypeScript

## Repository Structure

The final directory structure will look like this:

```
Todo/
├── backend/            # FastAPI + uv
│   ├── app/
│   │   ├── api/        # API endpoints
│   │   ├── core/       # Config, security, DB connection
│   │   ├── crud/       # DB operations
│   │   ├── middleware/ # Custom middleware
│   │   ├── models/     # SQLModel models
│   │   ├── schemas/    # Pydantic schemas
│   │   └── main.py     # Application entry point
│   ├── migrations/     # Alembic migrations
│   ├── tests/          # pytest tests
│   └── pyproject.toml  # Python dependencies
├── frontend/           # Next.js + Bun
│   ├── src/
│   │   ├── app/        # Next.js App Router
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React Hooks
│   │   └── lib/        # Utilities, API client
│   ├── e2e/            # Playwright E2E tests
│   └── package.json    # Node dependencies
├── docker/             # Dockerfile
├── docker-compose.yml  # Service configuration
├── justfile            # Task runner
└── docs/               # Documentation
```

## Ready to Start

Let's begin with [Chapter 01: Technology Stack Overview](01-introduction.md).
