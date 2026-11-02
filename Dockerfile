# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# ---- deps: install all dependencies once, cached by lockfile ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- builder: compile the Next.js app ----
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# Build needs no secrets: env is read lazily at runtime.
RUN npm run build

# ---- tools: one-shot jobs (migrations, admin seed) with dev dependencies ----
FROM builder AS tools
ENV NODE_ENV=production
USER node
CMD ["npm", "run", "db:migrate"]

# ---- runner: minimal production image, non-root ----
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads
RUN mkdir -p /data/uploads && chown -R node:node /data
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "server.js"]
