# SlotPoll - Ready to Launch! 🚀

Your SlotPoll MVP is ready! Here's everything configured for you.

## What's Been Set Up

✅ **Docker + Traefik** - Reverse proxy with auto-SSL
✅ **Next.js 15 App** - Modern React with App Router
✅ **PostgreSQL Database** - With Drizzle ORM
✅ **Redis Cache** - For sessions
✅ **Magic Link Auth** - Via Resend (configured with your API key)
✅ **User Roles** - Super User, Admin, Normal
✅ **Poll System** - Create, vote, view results

## Your Configuration

```
Domain: localhost (change for production)
Super User: REDACTED@example.com
Email From: noreply@yourdomain.com
Resend API Key: Configured ✓
NextAuth Secret: Generated ✓
```

## Quick Start (3 Steps)

### 1. Install Dependencies

```bash
cd /opt/slotpoll/app
npm install
cd ..
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# Watch the logs (Ctrl+C to exit)
docker-compose logs -f app
```

### 3. Initialize Database

```bash
# Push the schema to PostgreSQL
docker-compose exec app npm run db:push
```

## Access Your App

- **Application**: http://localhost:3000
- **Traefik Dashboard**: http://localhost:8080

## First Login

1. Go to http://localhost:3000
2. Click "Sign In"
3. Enter: `REDACTED@example.com`
4. Check your email for the magic link
5. Click the link to sign in
6. You're now a Super User! 🎉

## Create Your First Poll

1. Click "Create Poll" in the header
2. Fill in poll details (title, description, location)
3. Add multiple time slots
4. Click "Create Poll"
5. Share the URL with participants!

## Common Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove all data
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build app

# Access database
docker-compose exec postgres psql -U slotpoll -d slotpoll

# Backup database
./scripts/backup-db.sh
```

## Project Structure

```
slotpoll/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/                 # Pages (routes)
│   │   │   ├── page.tsx         # Home page
│   │   │   ├── auth/            # Auth pages
│   │   │   ├── dashboard/       # User dashboard
│   │   │   ├── polls/           # Poll pages
│   │   │   └── api/             # API routes
│   │   ├── components/          # React components
│   │   │   ├── ui/              # UI components
│   │   │   ├── header.tsx       # Site header
│   │   │   ├── poll-voting-form.tsx
│   │   │   └── poll-results.tsx
│   │   ├── lib/                 # Utilities
│   │   │   ├── auth/            # Auth config
│   │   │   ├── email/           # Email templates
│   │   │   └── utils.ts
│   │   └── db/                  # Database
│   │       ├── schema.ts        # DB schema
│   │       ├── index.ts         # DB client
│   │       └── migrations/      # Migrations
│   ├── Dockerfile
│   └── package.json
├── traefik/                      # Reverse proxy config
├── scripts/                      # Helper scripts
├── docker-compose.yml
└── .env                          # Configuration
```

## MVP Features Included

### Authentication
- ✅ Magic link login (passwordless)
- ✅ Email verification via Resend
- ✅ Role-based access (Super User, Admin, Normal)
- ✅ Session management

### Polls
- ✅ Create polls with multiple time slots
- ✅ Add title, description, location
- ✅ Unique shareable links
- ✅ Poll status (draft, active, closed)

### Voting
- ✅ Vote: Yes/No/Maybe
- ✅ No login required for voting
- ✅ Participant name + email
- ✅ Real-time results

### Results
- ✅ Visual progress bars
- ✅ Vote counts per slot
- ✅ Participant list (for creators)
- ✅ Best time slot ranking

### Dashboard
- ✅ View all your polls
- ✅ Poll statistics
- ✅ Quick access to polls

## Next Steps (Phase 2)

After the MVP is working, you can add:

- [ ] Edit polls
- [ ] Delete polls
- [ ] Export results (CSV/PDF)
- [ ] Email invitations
- [ ] Response notifications
- [ ] Comments on polls
- [ ] Poll templates
- [ ] Admin dashboard
- [ ] User management
- [ ] Analytics

## Production Deployment

When ready for production:

1. **Get a domain** and point it to your server
2. **Update .env**:
   ```env
   DOMAIN=yourdomain.com
   APP_URL=https://slotpoll.yourdomain.com
   NEXTAUTH_URL=https://slotpoll.yourdomain.com
   NODE_ENV=production
   BUILD_TARGET=production
   ```

3. **Configure Resend domain** at https://resend.com
4. **Start in production mode**:
   ```bash
   NODE_ENV=production BUILD_TARGET=production docker-compose up -d --build
   ```

5. **Enable firewall**:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

6. **Set up backups**:
   ```bash
   # Add to crontab
   0 2 * * * /opt/slotpoll/scripts/backup-db.sh
   ```

## Troubleshooting

### Can't receive magic link emails?

1. Check Resend API key in .env
2. Verify domain in Resend dashboard
3. Check app logs: `docker-compose logs app`
4. Test Resend in their dashboard

### Port conflicts?

```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000

# Stop conflicting services
sudo systemctl stop nginx  # if using nginx
```

### Database connection failed?

```bash
# Check PostgreSQL status
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Build errors?

```bash
# Clean and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Need Help?

- 📖 See [QUICKSTART.md](./QUICKSTART.md) for detailed setup
- 📖 See [README.md](./README.md) for more documentation
- 🐛 Check logs: `docker-compose logs -f`

## What's Working

✅ User authentication with magic links
✅ Create polls with multiple time slots
✅ Vote on polls (Yes/No/Maybe)
✅ View results with visual charts
✅ Dashboard to manage your polls
✅ Role-based access control
✅ Email notifications via Resend
✅ Docker deployment with Traefik

## Enjoy Building! 🎉

Your SlotPoll MVP is production-ready. Start creating polls and gathering responses!

For questions or issues, check the logs or review the documentation.

Happy scheduling! 📅
