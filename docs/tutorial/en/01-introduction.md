# 01. Technology Stack Overview

This chapter explains the technology stack used in this project and the rationale behind each selection.

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                        │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ App Router │  │ shadcn/ui  │  │  TanStack Query     │   │
│  │ Pages      │  │ Components │  │  (State Mgmt)       │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│  ┌────────────┐  ┌────────────┐                            │
│  │ React Hook │  │    Zod     │                            │
│  │ Form       │  │ Validation │                            │
│  └────────────┘  └────────────┘                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API (JSON)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ API Routes │  │ Auth (JWT) │  │   Rate Limiting     │   │
│  │ (api_v1)   │  │ python-jose│  │   (SlowAPI)         │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ SQLModel   │  │ CRUD Ops   │  │   Structured        │   │
│  │ (ORM)      │  │ (db layer) │  │   Logging           │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQLAlchemy (async)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database (PostgreSQL)                      │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │   users    │  │   todos    │  │   alembic_version   │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Frontend

### Next.js 16 (App Router)

**Role**: React Framework

**Selection Rationale**:
- **App Router**: Performance optimization through Server Components compared to traditional Pages Router
- **Full-stack capabilities**: API Routes, middleware, image optimization included by default
- **TypeScript native**: Easy to ensure type safety

### TypeScript

**Role**: Typed JavaScript

**Selection Rationale**:
- **Type safety**: Detect errors at compile time, reducing bugs
- **IDE support**: Powerful autocomplete and refactoring
- **Schema sharing**: Easy to maintain type consistency with backend Pydantic schemas

### Tailwind CSS

**Role**: Utility-first CSS framework

**Selection Rationale**:
- **Development speed**: No need to think about class names, write styles directly in HTML
- **Design consistency**: Preset design system (colors, spacing, typography)
- **Build optimization**: Unused styles are automatically removed, outputting lightweight CSS

### shadcn/ui

**Role**: Reusable UI component library

**Selection Rationale**:
- **Copy & paste approach**: Not as an npm package, but actual code placed in the project for free customization
- **Tailwind CSS integration**: Fully integrated with Tailwind
- **Accessibility**: WAI-ARIA compliant components
- **Radix UI based**: Built on a robust headless UI library

### TanStack React Query

**Role**: Server state management library

**Selection Rationale**:
- **Caching**: Automatically caches API responses and optimizes refetching
- **Optimistic updates**: Update UI immediately, sync with API in background
- **Error handling**: Automatic retry on errors, loading state management
- **Data synchronization**: Automatic revalidation after mutations

### React Hook Form + Zod

**Role**: Form management and validation

**Selection Rationale**:
- **Performance**: Prevents unnecessary re-renders with uncontrolled components
- **Type safety**: Automatically generates TypeScript types from Zod schemas
- **Lightweight**: Small bundle size
- **Error messages**: Easy to localize

## Backend

### FastAPI

**Role**: High-performance Python web framework

**Selection Rationale**:
- **Async support**: High-performance I/O processing with `async`/`await`
- **Auto documentation**: Generates OpenAPI/Swagger documentation from code
- **Type hints**: Automatic validation and serialization from Python type hints
- **Ecosystem**: Rich integration with SQLModel, python-jose, etc.

### SQLModel

**Role**: ORM (Object-Relational Mapping)

**Selection Rationale**:
- **Pydantic integration**: Reduces code duplication between database models and API schemas
- **SQLAlchemy based**: Can use features of a mature ORM as-is
- **Async support**: Asynchronous DB access with `AsyncSession`

### PostgreSQL + asyncpg

**Role**: Relational database

**Selection Rationale**:
- **Robustness**: Production-proven open source DB
- **Async driver**: High-performance asynchronous connections with `asyncpg`
- **JSON support**: Can store semi-structured data when needed
- **Alembic integration**: Standard integration with migration tools

### JWT (python-jose)

**Role**: Stateless authentication

**Selection Rationale**:
- **Scalability**: No need to maintain sessions on the server side
- **Standard**: High affinity with OAuth2 / OpenID Connect
- **FastAPI integration**: Easy integration with `OAuth2PasswordBearer`

### SlowAPI

**Role**: Rate limiting

**Selection Rationale**:
- **Simple**: Apply rate limits to endpoints with a single decorator
- **Flexible**: Different limits can be set per endpoint
- **Security**: Prevents brute force attacks and API abuse

## Development Tools & Infrastructure

### uv

**Role**: Python package manager and runtime

**Selection Rationale**:
- **Fast**: Overwhelmingly faster dependency resolution and installation than pip
- **Lock file**: Reproducible builds with `uv.lock`
- **Integration**: Modern Python project management based on `pyproject.toml`

### Bun

**Role**: JavaScript runtime and package manager

**Selection Rationale**:
- **Fast**: Faster package installation than npm/yarn
- **Next.js compatible**: Can run Next.js development server
- **Integration**: Runtime, package manager, and bundler in one

### Docker Compose

**Role**: Development environment containerization

**Selection Rationale**:
- **Consistency**: Share the same environment across the team
- **Easy startup**: Launch dependency services like DB instantly with `docker compose up`
- **Isolation**: Doesn't pollute the host machine

### just

**Role**: Command runner

**Selection Rationale**:
- **Simple**: Simpler syntax than Makefile
- **Cross-platform**: Works the same on Windows/Mac/Linux
- **Readability**: Aggregates development commands, easy to share within the team

## Next Steps

Once you understand the technology stack overview, let's set up the actual environment in [Chapter 02: Environment Setup](02-environment-setup.md).
