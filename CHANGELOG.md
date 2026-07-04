# Changelog

## v1.2.2 - 2026-07-04

### Changed
- Improve admin dashboard trend graph readability in compact metric cards.
- Clarify that admin trend graphs show created records from `createdAt`, not user activity tracking.

## v1.2.1 - 2026-07-04

### Added
- Add compact admin dashboard trend graphs for users, polls, slots, participants, and votes.
- Add daily, weekly, and monthly graph views for admin metric cards.

## v1.2.0 - 2026-07-03

### Added
- Add admin user activity counts for users online now, seen today, seen this week, and seen this month.

## v1.1.1 - 2026-07-03

### Added
- Display the app version in the site footer.
- Add release notes in `CHANGELOG.md`.

## v1.1.0 - 2026-07-03

### Added
- Auto-close active polls after all proposed times have passed, with a 24-hour grace period.
- Start the 30-day GDPR deletion timer after auto-close.
- Admin dashboard lifetime, active, online, and scheduled-deletion stats.
- Anonymous lifetime aggregate counters for deleted rows.
- `lastSeenAt` tracking for authenticated users.
- Owner and admin UI messaging for automatically closed polls.

### Changed
- Admin lists show retained records while top-level stats keep anonymous lifetime totals.
- README documents auto-close, admin stats, and `lastSeenAt` privacy behavior.

### Fixed
- Removed the `/account` prerender warning caused by redirecting during render.

## v1.0.0 - 2026-02-07

### Added
- Initial production-ready SlotPoll release.
- Poll creation, voting, admin management, and dashboard flows.
- Email magic-link authentication.
- Account management and GDPR deletion support.
- Demo cleanup and GDPR cleanup jobs.
- Health endpoint and safe error pages.

### Security
- Removed hardcoded credentials and deployment-specific domains from tracked files.
- Added production hardening and dependency security updates.
- Disabled `X-Powered-By`.
