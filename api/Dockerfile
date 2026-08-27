ARG NODE_VERSION=22
ARG APP_WORKING_DIR="/usr/src/clip-forge-api"

# BUILDER
FROM node:${NODE_VERSION}-alpine AS builder

ARG APP_WORKING_DIR

WORKDIR ${APP_WORKING_DIR}

RUN npm install -g pnpm@10

COPY ./package.json ./pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm run build

# Production
FROM node:${NODE_VERSION}-alpine AS production

ARG APP_WORKING_DIR

ENV NODE_ENV=production

WORKDIR ${APP_WORKING_DIR}

RUN apk add --no-cache \
    ffmpeg \
    yt-dlp

COPY --from=builder ${APP_WORKING_DIR}/dist ./dist
COPY --from=builder ${APP_WORKING_DIR}/node_modules ./node_modules

EXPOSE 3000
ENTRYPOINT [ "node", "./dist/main.js" ]
