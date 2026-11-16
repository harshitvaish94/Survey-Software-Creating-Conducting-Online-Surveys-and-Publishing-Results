FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# The official image turns templates into conf.d/*.conf at start-up, filling in env vars.
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Where the browser may send API requests (Content-Security-Policy connect-src).
# Set it to the real API address when deploying, e.g. API_ORIGIN=https://api.example.com
ENV API_ORIGIN="http://localhost:3000"
COPY --from=build /app/dist /usr/share/nginx/html
# At start-up, tells the app where the API is (same image for staging and production).
# Set BACKEND_URL (e.g. https://sms-api.onrender.com) to forward /api/ to the backend,
# or API_URL to have the browser call the API directly. See docs/DEPLOYMENT.md.
RUN mkdir -p /etc/nginx/app
COPY docker/40-app-config.sh /docker-entrypoint.d/40-app-config.sh
RUN chmod +x /docker-entrypoint.d/40-app-config.sh
EXPOSE 80
