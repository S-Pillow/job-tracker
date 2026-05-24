#!/usr/bin/env bash
# Daily SQLite backup for job-tracker
# Keeps the 14 most recent copies (2 weeks of history)
set -euo pipefail

DB_FILE="/root/job-tracker/production.db"
BACKUP_DIR="/root/job-tracker/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/production_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

# Use SQLite's online backup API — safe while the app is running
sqlite3 "$DB_FILE" ".backup '${BACKUP_FILE}'"

# Verify the backup is a valid SQLite file
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "^ok$"; then
  echo "[$(date -u +%FT%TZ)] Backup OK: ${BACKUP_FILE} ($(du -sh "$BACKUP_FILE" | cut -f1))"
else
  echo "[$(date -u +%FT%TZ)] ERROR: Backup integrity check failed: ${BACKUP_FILE}" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Prune — keep only the 14 most recent backups
ls -t "${BACKUP_DIR}"/production_*.db 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "[$(date -u +%FT%TZ)] Retention: $(ls "${BACKUP_DIR}"/production_*.db 2>/dev/null | wc -l) backups retained"
