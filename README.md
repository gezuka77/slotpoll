# SlotPoll - Modern Scheduling & Polling Tool

A lightweight, self-hosted alternative to Doodle for team scheduling and polling.

## Features

- 📅 Create polls with multiple date/time slots
- 🗳️ Vote on available slots (Yes/No/Maybe)
- 👥 Role-based access (Super User, Admin, Normal User)
- 📧 Email notifications via Resend
- 🔒 Secure authentication
- 🐳 Docker-based deployment with Traefik
- ⚖️ GDPR compliant with automatic data cleanup
- 🗑️ Account deletion with data anonymization
- 📋 90-day log retention policy

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

4. Set up Traefik config files:
```bash
cp traefik/traefik.yml.example traefik/traefik.yml
cp traefik/dynamic/slotpoll.yml.example traefik/dynamic/slotpoll.yml
touch traefik/acme.json
chmod 600 traefik/acme.json
```
Edit both `.yml` files with your domain, email, and dashboard password.

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

## GDPR Compliance

SlotPoll implements comprehensive GDPR compliance features:

### Automatic Poll Deletion

Polls are automatically deleted **30 days after they are closed** to comply with GDPR data retention requirements.

**How It Works:**
1. When a poll is closed, a `closedAt` timestamp is recorded
2. A cleanup cron job runs daily at 2 AM UTC
3. Polls closed for more than 30 days are permanently deleted
4. All associated data (slots, votes, comments, participants) is removed via CASCADE

### Account Deletion

Users can delete their accounts at any time through the Account page.

**What Happens:**
- User account and authentication data are permanently deleted
- All polls created by the user are deleted
- Participation in other polls is **anonymized** (name becomes "Deleted User", email removed)
- Votes are preserved to maintain poll integrity while removing personal information

This balances the right to deletion with the legitimate interest of maintaining poll results.

### Log Retention

Security and application logs are automatically rotated and retained for **90 days**:
- Daily log rotation with automatic compression
- Old logs are automatically deleted after 90 days
- Configured via logrotate for compliance with privacy policy

### Setup Automated Cleanup

For new deployments, run the one-time setup script:

```bash
# Install cron jobs, log rotation, and create log files
./cron/setup.sh
```

This configures:
- **GDPR cleanup**: Daily at 2 AM UTC - Deletes polls closed >30 days
- **Demo cleanup**: Daily at midnight UTC - Resets demo poll
- **Log rotation**: 90-day retention with automatic compression
- **Reboot tasks**: Both jobs run 5 minutes after system restart

**Verify installation:**
```bash
# View installed cron jobs
crontab -l

# View cleanup logs
tail -f /var/log/gdpr-cleanup.log
tail -f /var/log/demo-cleanup.log

# Check log rotation config
cat /etc/logrotate.d/slotpoll
```

### Manual Cleanup

Test or run cleanup manually:

```bash
# Dry run - check what would be deleted
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://slotpoll.yourdomain.com/api/cron/cleanup-polls

# Execute cleanup
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  https://slotpoll.yourdomain.com/api/cron/cleanup-polls
```

**API Endpoints:**
- `GET /api/cron/cleanup-polls` - Dry run (preview deletions)
- `POST /api/cron/cleanup-polls` - Execute cleanup

Both require `Authorization: Bearer DEMO_CLEANUP_TOKEN` header.

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
