#!/bin/sh
set -e

if [ -z "${DEMO_CLEANUP_TOKEN:-}" ]; then
  echo "DEMO_CLEANUP_TOKEN not set"
  exit 1
fi

curl -sS -X POST \
  -H "x-demo-cleanup-token: ${DEMO_CLEANUP_TOKEN}" \
  "http://app:3000/api/admin/demo/cleanup"
