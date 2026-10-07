# Build stage
FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable pnpm

# Install build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

RUN corepack enable pnpm

# Install build dependencies for native compilation and clean up
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm rebuild better-sqlite3

# Copy compiled application and documentation
COPY --from=builder /app/dist ./dist
COPY src/docs/openapi.yaml ./dist/docs/openapi.yaml

# Setup data directory with appropriate permissions
RUN mkdir -p /app/data && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/crypto_tracker.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/server.js"]
