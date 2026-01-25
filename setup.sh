#!/bin/bash

# SlotPoll Setup Script

set -e

echo "🚀 Setting up SlotPoll..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env

    # Generate secrets
    echo "🔐 Generating secure secrets..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

    # Update .env file
    sed -i "s/change_this_secure_password/${DB_PASSWORD}/g" .env
    sed -i "s/change_this_redis_password/${REDIS_PASSWORD}/g" .env
    sed -i "s/generate_with_openssl_rand_base64_32/${NEXTAUTH_SECRET}/g" .env

    echo "✅ .env file created with secure secrets"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and update:"
    echo "   - DOMAIN (your domain name)"
    echo "   - RESEND_API_KEY (your Resend API key)"
    echo "   - SUPER_USER_EMAIL (your email for super user access)"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p traefik backups app/src/db/migrations

# Create and set permissions for acme.json
if [ ! -f traefik/acme.json ]; then
    echo "🔐 Creating traefik/acme.json..."
    touch traefik/acme.json
    chmod 600 traefik/acme.json
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file: nano .env"
echo "   2. Install dependencies: cd app && npm install"
echo "   3. Start services: docker-compose up -d"
echo "   4. Run migrations: docker-compose exec app npm run db:push"
echo "   5. Access the app at: https://slotpoll.${DOMAIN:-localhost}"
echo ""
