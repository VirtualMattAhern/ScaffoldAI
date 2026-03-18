# SkafoldAI Web - Production Dockerfile
# Multi-stage: build then serve with nginx

FROM node:20-alpine AS builder

WORKDIR /app

# Build with API URL and Entra ID (override at build time)
ARG VITE_API_URL=/api
ARG VITE_ENTRA_CLIENT_ID=
ARG VITE_ENTRA_TENANT_ID=
ARG VITE_APP_URL=https://www.skafoldai.com
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID
ENV VITE_ENTRA_TENANT_ID=$VITE_ENTRA_TENANT_ID
ENV VITE_APP_URL=$VITE_APP_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - nginx for static SPA
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: serve index.html for all routes (API called directly by browser via VITE_API_URL)
RUN rm -f /etc/nginx/conf.d/default.conf && \
    echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
