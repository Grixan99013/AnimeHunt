# ── Build фронтенда ───────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Сначала копируем зависимости для кэша
COPY package*.json ./
RUN npm ci --silent

# Копируем исходники и собираем Vite-проект
COPY index.html vite.config.js tailwind.config.* postcss.config.* ./
COPY public ./public
COPY src ./src

# VITE_API_URL можно переопределить через build ARG
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Продакшен-образ сервера ───────────────────────────────────
FROM node:20-alpine AS server
WORKDIR /app

# Только серверные зависимости
COPY server/package*.json ./server/
RUN cd server && npm ci --silent --omit=dev

# Серверный код
COPY server ./server

# Скомпилированный фронт
COPY --from=frontend-build /app/dist ./dist

# Express будет раздавать dist/ как статику
ENV NODE_ENV=production
ENV PORT=3001

# Создаём папку для загрузок (если не монтируется volume)
RUN mkdir -p ./server/uploads && chown node:node ./server/uploads

USER node
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server/index.js"]
