#!/bin/bash

# Database Backup Script

set -e

# Load environment variables
source .env

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/slotpoll_${TIMESTAMP}.sql"

echo "📦 Creating database backup..."

docker-compose exec -T postgres pg_dump -U ${DB_USER} ${DB_NAME} > ${BACKUP_FILE}

# Compress backup
gzip ${BACKUP_FILE}

echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Keep only last 30 days of backups
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete

echo "🗑️  Old backups cleaned up"
