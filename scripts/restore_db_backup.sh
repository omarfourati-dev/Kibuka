#!/usr/bin/env bash
# Stellt die Kibuka-Datenbank aus einem Backup auf myvps wieder her.
# ACHTUNG: Überschreibt die aktuellen Daten (pg_restore --clean).
#
#   bash scripts/restore_db_backup.sh              # listet verfügbare Backups
#   bash scripts/restore_db_backup.sh <dateiname>  # stellt dieses Backup her
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Verfügbare Backups auf myvps (neueste zuletzt):"
  ssh myvps 'ls -lh /var/backups/kibuka/ | grep kibuka-'
  echo
  echo "Wiederherstellen mit: bash scripts/restore_db_backup.sh <dateiname>"
  exit 0
fi

DUMP="$1"
case "$DUMP" in
  kibuka-*.dump) ;;
  *) echo "Ungültiger Dateiname: $DUMP" >&2; exit 1 ;;
esac

read -r -p "Datenbank mit $DUMP ÜBERSCHREIBEN? Tippe 'wiederherstellen': " CONFIRM
[ "$CONFIRM" = "wiederherstellen" ] || { echo "Abgebrochen."; exit 1; }

ssh myvps "bash -s" -- "$DUMP" <<'REMOTE'
set -euo pipefail
DUMP="$1"
test -f "/var/backups/kibuka/$DUMP" || { echo "Backup nicht gefunden" >&2; exit 1; }
# Backend/Worker anhalten, damit niemand während des Restores schreibt
docker stop kibuka-backend kibuka-worker >/dev/null
docker exec -i kibuka-db-backup sh -c \
  "pg_restore -h db -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" --clean --if-exists --no-owner /backups/$DUMP"
docker start kibuka-backend kibuka-worker >/dev/null
echo "Wiederhergestellt: $DUMP"
REMOTE
