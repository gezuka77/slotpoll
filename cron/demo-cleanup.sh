#!/bin/sh
set -e

if [ -z "${DEMO_CLEANUP_TOKEN:-}" ]; then
  echo "DEMO_CLEANUP_TOKEN not set"
  exit 1
fi

# Try Docker internal hostname first, fall back to external URL
if curl -sS -X POST --max-time 5 \
  -H "x-demo-cleanup-token: ${DEMO_CLEANUP_TOKEN}" \
  "http://app:3000/api/admin/demo/cleanup" 2>/dev/null; then
  exit 0
fi

# Fall back to external URL
curl -sS -X POST \
  -H "x-demo-cleanup-token: ${DEMO_CLEANUP_TOKEN}" \
  "${APP_URL}/api/admin/demo/cleanup"
