# --- deps: install once, cached by lockfile hash ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: `NEXT_PUBLIC_*` vars are inlined into the client bundle at build
# time (standard Next.js behavior), so they must be supplied as build ARGs,
# not runtime env vars - setting them only on `docker run` would have no
# effect on an already-built bundle ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_ORIGIN=http://localhost:5050
ARG NEXT_PUBLIC_API_PREFIX=/api
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN
ENV NEXT_PUBLIC_API_PREFIX=$NEXT_PUBLIC_API_PREFIX
RUN npm run build

# --- runtime: Next's standalone output only copies the node_modules subset
# actually reachable from the server bundle, so no separate prod-deps
# install/copy step is needed here (unlike the API's Dockerfile) ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
