# SlotPoll - Modern Scheduling & Polling Tool

A lightweight, self-hosted alternative to Doodle for team scheduling and polling.

## Features

- 📅 Create polls with multiple date/time slots
- 🗳️ Vote on available slots (Yes/No/Maybe)
- 👥 Role-based access (Super User, Admin, Normal User)
- 📧 Email notifications via Resend
- 🔒 Secure authentication
- 🐳 Docker-based deployment with Traefik

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Domain name (optional, can use localhost for testing)

### Installation

1. Clone the repository and navigate to the project:
```bash
cd /opt/slotpoll
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Edit `.env` and set your values:
```bash
nano .env
```

Generate secure secrets:
```bash
# NextAuth Secret
openssl rand -base64 32

# Traefik Dashboard Password
htpasswd -nb admin your_password
```

4. Create Traefik acme.json:
```bash
touch traefik/acme.json
chmod 600 traefik/acme.json
```

5. Start services:
```bash
# Development mode
docker-compose up -d

# Production mode
NODE_ENV=production BUILD_TARGET=production docker-compose up -d --build
```

6. Run database migrations:
```bash
docker-compose exec app npm run db:push
```

7. Access the app:
- App: https://slotpoll.localhost
- Traefik Dashboard: https://traefik.localhost

## Development

### Local Development

```bash
cd app
npm install
npm run dev
```

### Database Management

```bash
# Push schema changes
docker-compose exec app npm run db:push

# Generate migrations
docker-compose exec app npm run db:generate

# Open Drizzle Studio
docker-compose exec app npm run db:studio
```

### Database Backup

```bash
# Manual backup
docker-compose exec postgres pg_dump -U slotpoll slotpoll > backups/backup_$(date +%Y%m%d).sql

# Automatic backups run daily (configured in docker-compose.yml)
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

## User Roles

### Super User
- Platform owner
- Manage all users and polls
- System configuration
- First user with SUPER_USER_EMAIL becomes super user

### Admin
- Create unlimited polls
- Manage organization polls
- Invite team members

### Normal User
- Create limited polls (3 active)
- Vote on polls
- Basic features

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Drizzle ORM
- **Cache**: Redis
- **Auth**: NextAuth.js
- **Email**: Resend
- **Deployment**: Docker + Traefik

## Project Structure

```
slotpoll/
├── app/                    # Next.js application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities & configs
│   │   └── db/            # Database schema
│   ├── Dockerfile
│   └── package.json
├── traefik/               # Reverse proxy config
├── backups/               # Database backups
└── docker-compose.yml
```

## Environment Variables

See `.env.example` for all configuration options.

## License

MIT
