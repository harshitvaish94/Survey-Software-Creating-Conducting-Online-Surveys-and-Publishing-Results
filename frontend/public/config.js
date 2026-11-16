// Runtime settings. In the production container this file is rewritten at start-up
// from BACKEND_URL or API_URL (docker/40-app-config.sh). Empty here, so
// local development falls back to VITE_API_URL or <this host>:3000.
window.__APP_CONFIG__ = {}
