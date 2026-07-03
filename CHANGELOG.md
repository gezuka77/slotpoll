# Changelog

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
