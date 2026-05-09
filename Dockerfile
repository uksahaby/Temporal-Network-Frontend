# ─────────────────────────────────────────────
# Stage 1: Install all npm dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────
# Stage 2: Build the Next.js application
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked in at build time.
# Browsers call localhost:8000 because the backend container
# publishes its port to the host on 8000.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Turbopack (only relevant for dev; here just prevents warnings)
ENV NEXT_DISABLE_TURBOPACK=1

RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: Lightweight production image
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only what Next.js needs to run
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
