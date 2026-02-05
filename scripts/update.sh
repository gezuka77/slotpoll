#!/bin/bash

# Update Script

set -e

echo "🔄 Updating SlotPoll..."

# Pull latest changes (if using git)
if [ -d .git ]; then
    echo "📥 Pulling latest changes..."
    git pull
fi

# Backup database
echo "📦 Creating backup..."
docker compose exec postgres pg_dump -U slotpoll slotpoll > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Install dependencies
echo "📦 Installing dependencies..."
cd app && npm install && cd ..

# Rebuild and restart services
echo "🔨 Rebuilding services..."
docker-compose build app

echo "🚀 Restarting services..."
docker-compose up -d app

# Run migrations
echo "🗄️  Running migrations..."
docker-compose exec app npm run db:push

echo "✅ Update complete!"
