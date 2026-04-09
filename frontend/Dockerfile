# ── 開発ステージ（Vite ホットリロード）──────────────────────
FROM node:lts-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

EXPOSE 5173
CMD ["npm", "run", "dev"]
