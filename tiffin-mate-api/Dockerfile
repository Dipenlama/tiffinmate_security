# --- deps: install full dependency tree (incl. devDependencies) once, cached
# by lockfile hash so `npm run build`/test changes below don't bust it ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript -> dist using the full dep tree above ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# --- prod-deps: a second, independent install with only production
# dependencies, so none of the ~30 test-only packages (jest, ts-node,
# mongodb-memory-server, ts-jest...) end up in the runtime image ---
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime: minimal final image, non-root, only compiled JS + prod deps ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# The app writes uploaded item images to ./uploads/items at runtime
# (upload.middleware.ts creates the directory on boot if missing) - it needs
# to exist and be writable by the non-root user below, since Alpine's node
# image already ships an unprivileged `node` user/group (uid/gid 1000) rather
# than defining a new one.
RUN mkdir -p /app/uploads/items && chown -R node:node /app
USER node

EXPOSE 5050

# Uses Node's built-in http client instead of adding curl/wget just for this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 5050) + '/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
