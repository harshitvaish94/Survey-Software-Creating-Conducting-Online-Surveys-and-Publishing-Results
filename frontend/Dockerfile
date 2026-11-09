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
ENV API_ORIGIN="https: http://localhost:3000"
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
