#!/usr/bin/env bash
# Prüft, ob sich das neueste Kibuka-Backup wirklich wiederherstellen lässt —
# OHNE die Live-Datenbank anzufassen: Restore in einen Wegwerf-Container ohne
# Netzwerk, Ausgabe nur Zeilenzahlen (keine personenbezogenen Daten).
#
#   bash scripts/verify_db_backup.sh              # neuestes Backup
#   bash scripts/verify_db_backup.sh <dateiname>  # bestimmtes Backup
set -euo pipefail

DUMP="${1:-}"
if [ -n "$DUMP" ]; then
  case "$DUMP" in
    kibuka-*.dump) ;;
    *) echo "Ungültiger Dateiname: $DUMP" >&2; exit 1 ;;
  esac
fi

ssh myvps "bash -s" -- "$DUMP" <<'REMOTE'
set -euo pipefail
DIR=/var/backups/kibuka
DUMP="${1:-$(ls -1t "$DIR" | grep -E '^kibuka-.*\.dump$' | head -1)}"
test -n "$DUMP" && test -f "$DIR/$DUMP" || { echo "Kein Backup gefunden" >&2; exit 1; }
echo "Backup: $DUMP ($(du -h "$DIR/$DUMP" | cut -f1), $(date -r "$DIR/$DUMP" -u +%Y-%m-%dT%H:%MZ))"

NAME="kibuka-restore-check-$$"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Wegwerf-Postgres ohne Netzwerk; Passwort nur für diesen Container
docker run -d --rm --name "$NAME" --network none \
  -e POSTGRES_PASSWORD="check-$$" -e POSTGRES_DB=restorecheck \
  -v "$DIR/$DUMP:/restore.dump:ro" pgvector/pgvector:pg16 >/dev/null
for _ in $(seq 1 30); do
  docker exec "$NAME" pg_isready -U postgres -d restorecheck >/dev/null 2>&1 && break
  sleep 1
done

docker exec "$NAME" pg_restore -U postgres -d restorecheck --no-owner --no-privileges \
  --exit-on-error /restore.dump
echo "Restore: OK"
docker exec "$NAME" psql -U postgres -d restorecheck -At -c "
  SELECT 'alembic_version=' || (SELECT version_num FROM alembic_version)
  UNION ALL SELECT 'users=' || count(*) FROM users
  UNION ALL SELECT 'books=' || count(*) FROM books
  UNION ALL SELECT 'book_purchases=' || count(*) FROM book_purchases
  UNION ALL SELECT 'book_subscriptions=' || count(*) FROM book_subscriptions;"
REMOTE
