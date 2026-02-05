#!/bin/bash
set -e

echo "🚀 Setting up SlotPoll automated tasks..."
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 1. Install cleanup scripts
echo "📋 Installing cleanup scripts..."
sudo cp "$SCRIPT_DIR/demo-cleanup.sh" /usr/local/bin/
sudo cp "$SCRIPT_DIR/gdpr-cleanup.sh" /usr/local/bin/
sudo chmod +x /usr/local/bin/demo-cleanup.sh /usr/local/bin/gdpr-cleanup.sh
echo "   ✓ Scripts installed to /usr/local/bin/"

# 2. Install crontab
echo ""
echo "⏰ Installing cron schedule..."
crontab "$SCRIPT_DIR/demo-cleanup.crontab"
echo "   ✓ Crontab installed"
echo "   • Demo cleanup: Daily at midnight UTC"
echo "   • GDPR cleanup: Daily at 2 AM UTC"
echo "   • Both run 5 minutes after reboot"

# 3. Install logrotate configuration
echo ""
echo "📜 Installing log rotation (90-day retention)..."
sudo cp "$SCRIPT_DIR/logrotate.conf" /etc/logrotate.d/slotpoll
echo "   ✓ Logrotate configured at /etc/logrotate.d/slotpoll"

# 4. Create initial log files with correct permissions
echo ""
echo "📝 Creating log files..."
sudo touch /var/log/demo-cleanup.log /var/log/gdpr-cleanup.log
sudo chmod 644 /var/log/demo-cleanup.log /var/log/gdpr-cleanup.log
echo "   ✓ Log files created"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Verify installation:"
echo "  crontab -l                          # View installed cron jobs"
echo "  cat /etc/logrotate.d/slotpoll       # View log rotation config"
echo ""
echo "Check logs:"
echo "  tail -f /var/log/demo-cleanup.log"
echo "  tail -f /var/log/gdpr-cleanup.log"
echo ""
echo "Manual test (optional):"
echo "  DEMO_CLEANUP_TOKEN=your_token /usr/local/bin/demo-cleanup.sh"
echo "  DEMO_CLEANUP_TOKEN=your_token /usr/local/bin/gdpr-cleanup.sh"
