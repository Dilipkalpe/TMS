#!/usr/bin/env bash
# Deploy an application to Production or Demo.
# Usage: bash deploy/environments/scripts/deploy.sh <tms|ims|rms> <prod|demo> [git-ref]
set -euo pipefail

APP="${1:?Usage: deploy.sh <tms|ims|rms> <prod|demo> [git-ref]}"
ENV="${2:?Usage: deploy.sh <tms|ims|rms> <prod|demo> [git-ref]}"
GIT_REF="${3:-}"

case "$APP" in
  tms|ims|rms) ;;
  *) echo "Unknown app: $APP"; exit 1 ;;
esac

case "$ENV" in
  prod|demo) ;;
  *) echo "Unknown env: $ENV (use prod or demo)"; exit 1 ;;
esac

APP_ROOT="/var/www/${ENV}/${APP}"
ENV_FILE="${APP_ROOT}/.env"
COMPOSE_FILE=""

if [ ! -d "$APP_ROOT" ]; then
  echo "ERROR: $APP_ROOT does not exist. Run setup-server.sh first."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: Missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a && source "$ENV_FILE" && set +a

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-${ENV}-${APP}}"

if [ "$APP" = "tms" ] && [ -f "${APP_ROOT}/deploy/environments/compose/tms.stack.yml" ]; then
  COMPOSE_FILE="${APP_ROOT}/deploy/environments/compose/tms.stack.yml"
elif [ -f "${APP_ROOT}/deploy/environments/compose/${APP}.stack.yml" ]; then
  COMPOSE_FILE="${APP_ROOT}/deploy/environments/compose/${APP}.stack.yml"
elif [ -f "${APP_ROOT}/deploy/environments/compose/${APP}.stack.template.yml" ]; then
  echo "ERROR: ${APP}.stack.yml not found — copy ${APP}.stack.template.yml and customize."
  exit 1
else
  echo "ERROR: No compose file for $APP"
  exit 1
fi

cd "$APP_ROOT"

if [ -d .git ]; then
  echo "==> Git pull (${GIT_BRANCH:-main})"
  git fetch "${GIT_REMOTE:-origin}"
  if [ -n "$GIT_REF" ]; then
    git checkout "$GIT_REF"
  else
    git pull --ff-only "${GIT_REMOTE:-origin}" "${GIT_BRANCH:-main}" || true
  fi
fi

if [ -n "$GIT_REF" ]; then
  export RELEASE_TAG="${GIT_REF//\//-}"
else
  export RELEASE_TAG="${RELEASE_TAG:-$(date +%Y%m%d-%H%M)}"
fi

echo "==> Deploy ${COMPOSE_PROJECT_NAME} (tag: ${RELEASE_TAG})"

if [ "$ENV" = "prod" ]; then
  echo "==> Production: zero-downtime API then Web"
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build tms-api 2>/dev/null \
    || docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps tms-api 2>/dev/null \
    || docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps "${APP}-api" 2>/dev/null \
    || docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps
  echo "    waiting for API health..."
  sleep 15
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps tms-web 2>/dev/null \
    || docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps "${APP}-web" 2>/dev/null \
    || true
else
  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
fi

echo ""
echo "==> Status"
docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "==> Health"
if [ -n "${WEB_HOST_PORT:-}" ]; then
  curl -fsS "http://127.0.0.1:${WEB_HOST_PORT}/" >/dev/null && echo "  Web OK :${WEB_HOST_PORT}" || echo "  Web check failed"
fi
if [ -n "${API_HOST_PORT:-}" ]; then
  curl -fsS "http://127.0.0.1:${API_HOST_PORT}/api/health" && echo "" || echo "  API check failed"
fi

echo ""
echo "Done: ${ENV}/${APP}"
