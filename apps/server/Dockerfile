# FITLIFE OS — Production Server Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace package definitions
COPY package.json turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/domain/package.json ./packages/domain/
COPY apps/server/package.json ./apps/server/

# Install dependencies
RUN npm ci

# Copy source trees
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Build all packages
RUN npm run build --workspace=@fitlife/shared-types
RUN npm run build --workspace=@fitlife/validation
RUN npm run build --workspace=@fitlife/domain
RUN npm run build --workspace=@fitlife/server

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Copy built artifacts and production node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/src/db/migrations ./apps/server/dist/db/migrations

EXPOSE 4000

USER node

CMD ["node", "apps/server/dist/server.js"]
