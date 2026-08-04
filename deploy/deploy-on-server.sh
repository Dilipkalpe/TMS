#!/usr/bin/env bash
# Legacy entry point — delegates to deploy-contabo.sh
# Run on Contabo: bash /var/www/tms/deploy/deploy-on-server.sh [--quick] [--smtp]
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/deploy-contabo.sh" "$@"
