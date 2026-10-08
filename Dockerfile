# syntax=docker/dockerfile:1

# Grid Console — static build served by nginx (proxies /api → core)
FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Relative URL — nginx in this image proxies /api to the core service.
# Production Vite gate requires a real `.env` file (not only process ENV).
ARG VITE_GRID_API_URL=/api/v1
ENV VITE_GRID_API_URL=$VITE_GRID_API_URL
RUN printf 'VITE_GRID_API_URL=%s\n' "$VITE_GRID_API_URL" > .env \
  && npm run build

FROM nginx:1.27-alpine
COPY install/nginx-default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
