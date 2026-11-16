#!/bin/sh
# Runs when the nginx container starts (the official image runs /docker-entrypoint.d/*.sh).
# Tells the app where the API is. Set ONE of these on the frontend service:
#
#   BACKEND_URL  (recommended) nginx forwards /api/... to this backend, so the browser
#                only talks to one site and the login cookie works even when frontend and
#                backend are on different domains (e.g. two *.onrender.com services).
#   API_URL      the browser calls this address directly (frontend and backend must be on
#                the same site, e.g. app.example.com and api.example.com).
#
# Neither set: the app calls <its own host>:3000 (local development).
set -eu
HTML=/usr/share/nginx/html
APP_CONF_DIR=${APP_CONF_DIR:-/etc/nginx/app}
BACKEND_URL="${BACKEND_URL:-}"
API_URL="${API_URL:-}"
URL_RE='^https?://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/-]*)?$'

mkdir -p "$APP_CONF_DIR"
: > "$APP_CONF_DIR/api-proxy.conf"

check_url() {
  if ! printf '%s' "$2" | grep -Eq "$URL_RE"; then
    echo "app-config: $1 must look like https://sms-api.onrender.com (got: $2)" >&2
    exit 1
  fi
}

if [ -n "$BACKEND_URL" ]; then
  check_url BACKEND_URL "$BACKEND_URL"
  BACKEND_URL="${BACKEND_URL%/}"
  cat > "$APP_CONF_DIR/api-proxy.conf" <<CONF
# Generated at start-up from BACKEND_URL
location /api/ {
  proxy_pass $BACKEND_URL/;
  proxy_ssl_server_name on;
  proxy_http_version 1.1;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
CONF
  echo 'window.__APP_CONFIG__ = { apiUrl: "/api" }' > "$HTML/config.js"
  echo "app-config: forwarding /api/ to $BACKEND_URL"
elif [ -n "$API_URL" ]; then
  check_url API_URL "$API_URL"
  printf 'window.__APP_CONFIG__ = { apiUrl: "%s" }\n' "${API_URL%/}" > "$HTML/config.js"
  echo "app-config: API_URL=${API_URL%/}"
else
  echo 'window.__APP_CONFIG__ = {}' > "$HTML/config.js"
  echo "app-config: BACKEND_URL and API_URL not set; the app will call <its own host>:3000" >&2
fi
