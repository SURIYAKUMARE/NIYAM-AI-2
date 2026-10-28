# Production Multi-Stage Dockerfile for AICTE Smart Approval Platform
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 8080

USER node

CMD ["node", "server.js"]
