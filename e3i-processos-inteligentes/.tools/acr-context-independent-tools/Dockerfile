FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
RUN groupadd --system e3i && useradd --system --gid e3i --home-dir /app e3i
COPY --from=build --chown=e3i:e3i /app/dist ./dist
COPY --from=build --chown=e3i:e3i /app/node_modules ./node_modules
COPY --from=build --chown=e3i:e3i /app/package.json ./package.json
COPY --from=build --chown=e3i:e3i /app/prisma ./prisma
COPY --from=build --chown=e3i:e3i /app/data ./data
USER e3i
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "dist/server.cjs"]
