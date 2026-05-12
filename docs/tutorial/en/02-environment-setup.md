# 02. Environment Setup

This chapter covers installing the tools needed for Todo app development and preparing the environment.

## Required Tools

| Tool | Purpose | Installation Method |
|:---|:---|:---|
| Docker Desktop | PostgreSQL container execution | Install DMG from official website |
| uv | Python package management | `curl` or `brew` |
| Bun | JavaScript runtime | `curl` or `brew` |
| just | Task runner | `brew` or `cargo` |

## 1. Install Docker Desktop

Docker Desktop is required to run PostgreSQL database and mail server (Mailpit) in Docker containers.

### For macOS

```bash
# Install with Homebrew
brew install --cask docker
```

Or download and install the DMG from the [Docker official website](https://www.docker.com/products/docker-desktop/).

After installation, start Docker Desktop and verify operation with the following commands:

```bash
docker --version
docker compose version
```

## 2. Install uv

uv is a fast Python package manager written in Rust.

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or Homebrew
brew install uv
```

After installation, restart your shell or run `source ~/.zshrc` to add it to your PATH.

Verify:

```bash
uv --version
```

## 3. Install Bun

Bun is a fast JavaScript runtime used for running Next.js development server and installing npm packages.

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Or Homebrew
brew install bun
```

Verify:

```bash
bun --version
```

## 4. Install just

just is a simple command runner that serves as an alternative to Makefile.

```bash
# Homebrew
brew install just

# Or cargo
cargo install just
```

Verify:

```bash
just --version
```

## 5. Create Environment Variable File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Example `.env` content:

```env
# Execution environment
ENVIRONMENT=development

# Database (match with Docker Compose settings)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=tododb

# JWT secret key (be sure to change to a strong random string in production)
SECRET_KEY=your-super-secret-key-change-in-production

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

`SECRET_KEY` is used for JWT signing, so **be sure to change it to a strong random string in production**. Any string is fine for the development environment.

## 6. Verify Docker Service Startup

Once the tools are installed, verify that PostgreSQL and Mailpit start correctly.

```bash
# Run from project root
just up
```

`just up` is equivalent to `docker compose up -d`, starting containers in the background.

Check running containers:

```bash
docker compose ps
```

Please verify that the following services are running:

- `db` (PostgreSQL 16)
- `mailpit` (Email catch server)

## 7. Check Ports

The ports used during development are as follows:

| Service | Port | Purpose |
|:---|:---|:---|
| Next.js (Frontend) | 3000 | Browser access |
| FastAPI (Backend) | 8000 | API server |
| PostgreSQL | 5432 | Database |
| Mailpit (Web UI) | 8025 | Development email verification |
| Mailpit (SMTP) | 1025 | Email sending server |

## Troubleshooting

### If port is already in use

```bash
# Check if port 5432 is in use
lsof -i :5432

# To terminate the process
kill -9 <PID>
```

### If Docker container fails to start

```bash
# Check logs
docker compose logs db

# Delete volume and initialize (database data will be lost)
just clean-db
```

### If uv command is not found

```bash
# Manually add to PATH
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Next Steps

Once the environment is set up, let's create the project skeleton in [Chapter 03: Project Initialization](03-project-init.md).
