#!/usr/bin/env bash
# Quick diagnostic — run on VPS: bash deploy/diagnose.sh
set -u

echo "=== Docker containers ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | grep -i tms || echo "No TMS containers found"

echo ""
echo "=== Port 8080 ==="
curl -fsS -m 3 http://127.0.0.1:8080/api/health 2>/dev/null && echo "" || echo "NOT RUNNING on :8080"

echo ""
echo "=== Port 5000 (API direct) ==="
curl -fsS -m 3 http://127.0.0.1:5000/api/health 2>/dev/null && echo "" || echo "NOT RUNNING on :5000"

echo ""
echo "=== nginx sites ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "nginx not configured"

echo ""
echo "=== Disk / memory ==="
df -h / | tail -1
free -h | head -2
