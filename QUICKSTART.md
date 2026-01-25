# SlotPoll Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- A domain name pointed to your server (or use localhost for testing)
- Resend API key (get one at https://resend.com)

## Installation

### 1. Run Setup Script

```bash
cd /opt/slotpoll
chmod +x setup.sh scripts/*.sh
./setup.sh
```

### 2. Configure Environment

Edit the `.env` file:

```bash
nano .env
```

Update these critical values:

```env
# Your domain
DOMAIN=yourdomain.com
APP_URL=https://slotpoll.yourdomain.com

# Get this from https://resend.com
RESEND_API_KEY=re_your_actual_api_key

# Email that will become super user
SUPER_USER_EMAIL=admin@yourdomain.com

# For production, change this
NODE_ENV=production
BUILD_TARGET=production
```

### 3. Install Node Dependencies

```bash
cd app
npm install
cd ..
```

### 4. Start Services

For development:
```bash
docker-compose up -d
```

For production:
```bash
NODE_ENV=production BUILD_TARGET=production docker-compose up -d --build
```

### 5. Run Database Migrations

```bash
docker-compose exec app npm run db:push
```

### 6. Access Your App

- **Application**: https://slotpoll.yourdomain.com (or localhost)
- **Traefik Dashboard**: https://traefik.yourdomain.com (or localhost)
  - Username: admin
  - Password: See TRAEFIK_DASHBOARD_USER in .env

## First Steps

1. **Create Super User Account**:
   - Go to your app URL
   - Click "Sign In"
   - Enter the email you set as SUPER_USER_EMAIL
   - Check your email for the magic link
   - Click the link to sign in

2. **Create Your First Poll**:
   - Click "Create Poll" in the header
   - Fill in poll details
   - Add multiple time slots
   - Click "Create Poll"

3. **Share Your Poll**:
   - Copy the poll URL
   - Share with participants
   - They can vote without signing in

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

### Restart Services
```bash
docker-compose restart app
```

### Database Access
```bash
# Open PostgreSQL shell
docker-compose exec postgres psql -U slotpoll -d slotpoll

# Drizzle Studio (visual database editor)
docker-compose exec app npm run db:studio
# Then open http://localhost:4983
```

### Backup Database
```bash
./scripts/backup-db.sh
```

### Update Application
```bash
./scripts/update.sh
```

## Development Mode

For local development with hot reload:

1. Update docker-compose.yml:
```yaml
# Set these in your .env or docker-compose
NODE_ENV=development
BUILD_TARGET=development
```

2. Start services:
```bash
docker-compose up -d
```

The app will now hot-reload when you make changes to files in the `app` directory.

## Troubleshooting

### App won't start

Check logs:
```bash
docker-compose logs app
```

Common issues:
- Database not ready: Wait a few seconds and try again
- Port conflicts: Check if ports 80, 443 are available
- Environment variables: Verify .env file is correct

### Can't receive magic link emails

1. Verify RESEND_API_KEY in .env
2. Check Resend dashboard for errors
3. Verify email domain is configured in Resend
4. Check app logs: `docker-compose logs app`

### Database connection issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check PostgreSQL logs
docker-compose logs postgres
```

### SSL/HTTPS issues

1. Verify domain DNS points to your server
2. Check Traefik logs: `docker-compose logs traefik`
3. Ensure ports 80 and 443 are open in firewall
4. Wait a few minutes for Let's Encrypt certificate

## Production Checklist

- [ ] Set strong passwords in .env
- [ ] Configure firewall (allow 22, 80, 443)
- [ ] Set up automated backups
- [ ] Configure Resend with verified domain
- [ ] Test magic link emails
- [ ] Set DOMAIN and APP_URL correctly
- [ ] Enable HTTPS via Let's Encrypt
- [ ] Set NODE_ENV=production
- [ ] Configure log rotation
- [ ] Set up monitoring (optional)

## User Roles

### Super User
- First user with SUPER_USER_EMAIL
- Full platform access
- Can manage all users and polls

### Admin
- Create unlimited polls
- Manage team polls
- View team analytics

### Normal User
- Create up to 3 active polls
- Basic features
- Can vote on any poll

## Support

For issues and questions:
- GitHub: https://github.com/anthropics/slotpoll/issues
- Documentation: See README.md

## Next Steps

- Invite team members
- Create poll templates
- Set up email notifications
- Configure custom branding
- Explore admin dashboard
