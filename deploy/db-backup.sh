#!/bin/sh
# Tägliches PostgreSQL-Backup (pg_dump, Custom-Format) mit Rotation.
# Läuft als eigener Compose-Dienst "db-backup"; Ziel ist ein Host-Ordner
# AUSSERHALB von /home/kibuka (den der Deploy-rsync --delete leert).
set -eu
# Dumps enthalten personenbezogene Daten und Passwort-Hashes — nur root darf lesen
umask 077

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DIR="${BACKUP_DIR:-/backups}"

chmod 700 "$DIR"

until pg_isready -h "${PGHOST:-db}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 5
done

while true; do
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  tmp="$DIR/.kibuka-$ts.dump.tmp"
  # Erst in eine Temp-Datei, dann atomar umbenennen — nie ein halbes Backup
  if pg_dump -h "${PGHOST:-db}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$tmp"; then
    mv "$tmp" "$DIR/kibuka-$ts.dump"
    echo "backup ok: kibuka-$ts.dump ($(du -h "$DIR/kibuka-$ts.dump" | cut -f1))"
  else
    rm -f "$tmp"
    echo "backup FAILED at $ts" >&2
  fi
  find "$DIR" -name 'kibuka-*.dump' -mtime +"$KEEP_DAYS" -delete
  sleep "$INTERVAL"
done
