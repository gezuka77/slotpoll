#!/bin/sh
set -e

if [ -z "${DEMO_CLEANUP_TOKEN:-}" ]; then
  echo "DEMO_CLEANUP_TOKEN not set"
  exit 1
fi

# Try Docker internal hostname first, fall back to external URL
if curl -sS -X POST --max-time 5 \
  -H "Authorization: Bearer ${DEMO_CLEANUP_TOKEN}" \
  "http://app:3000/api/cron/cleanup-polls" 2>/dev/null; then
  exit 0
fi

# Fall back to external URL
curl -sS -X POST \
  -H "Authorization: Bearer ${DEMO_CLEANUP_TOKEN}" \
  "https://slotpoll.yourdomain.com/api/cron/cleanup-polls"
