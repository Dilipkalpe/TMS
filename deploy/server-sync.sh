#!/usr/bin/env bash
# One-time recovery when "git pull" aborts due to local edits under deploy/
# Run on Contabo:  bash /var/www/tms/deploy/server-sync.sh
set -euo pipefail

REPO_DIR="${REPO_DIR:-/var/www/tms}"
cd "$REPO_DIR"

echo "==> Current commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "==> Local changes under deploy/ (tracked files only):"
git status --short deploy/ 2>/dev/null || true

echo "==> Discard tracked deploy script edits (keeps deploy/.env if untracked)"
git checkout -- deploy/deploy-contabo.sh deploy/verify-deploy.sh deploy/force-rebuild.sh deploy/deploy-on-server.sh 2>/dev/null || true
git checkout -- deploy/ 2>/dev/null || true

echo "==> git pull --ff-only"
git pull --ff-only

chmod +x deploy/*.sh 2>/dev/null || true

echo "==> Synced to $(git rev-parse --short HEAD) — $(git log -1 --oneline)"
echo "Next: bash deploy/deploy-contabo.sh"
