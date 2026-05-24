#!/usr/bin/env bash
# Daily SQLite backup for job-tracker
# Keeps the 14 most recent local copies (2 weeks of history)
#
# Offsite sync (optional):
#   Set OFFSITE_DEST to an rsync-compatible destination, e.g.:
#     export OFFSITE_DEST="user@backup-server:/backups/job-tracker/"
#     export OFFSITE_DEST="s3://my-bucket/job-tracker-backups/"  (requires rclone alias "s3")
#   If OFFSITE_DEST is unset, offsite sync is silently skipped.
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

# Prune — keep only the 14 most recent local backups
ls -t "${BACKUP_DIR}"/production_*.db 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "[$(date -u +%FT%TZ)] Retention: $(ls "${BACKUP_DIR}"/production_*.db 2>/dev/null | wc -l) local backups retained"

# Offsite sync (A5) — only runs if OFFSITE_DEST is set
if [[ -n "${OFFSITE_DEST:-}" ]]; then
  echo "[$(date -u +%FT%TZ)] Syncing to offsite: ${OFFSITE_DEST}"
  if command -v rclone &>/dev/null; then
    # rclone supports cloud targets (S3, B2, GCS, etc.)
    rclone copy "${BACKUP_FILE}" "${OFFSITE_DEST}" \
      --log-level INFO \
      && echo "[$(date -u +%FT%TZ)] Offsite sync OK (rclone)"
  elif command -v rsync &>/dev/null; then
    # rsync for SSH targets
    rsync -az --no-perms "${BACKUP_FILE}" "${OFFSITE_DEST}" \
      && echo "[$(date -u +%FT%TZ)] Offsite sync OK (rsync)"
  else
    echo "[$(date -u +%FT%TZ)] WARNING: OFFSITE_DEST set but neither rclone nor rsync found" >&2
  fi
else
  echo "[$(date -u +%FT%TZ)] No OFFSITE_DEST configured — local backup only"
fi
