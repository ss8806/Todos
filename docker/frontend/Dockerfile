FROM oven/bun:latest
WORKDIR /app
COPY frontend/package.json frontend/bun.lock ./
RUN bun install
COPY frontend ./
RUN bun run build
CMD ["bun", "run", "start"]
