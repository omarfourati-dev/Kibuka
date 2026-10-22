#!/usr/bin/env bash
# Setzt das Admin-Passwort auf dem Server neu (bleibt dort, erscheint nie im Chat/Kontext),
# speichert die Credentials AUSSERHALB des Deploy-Ordners (rsync --delete löscht /home/kibuka
# bei jedem Deploy — deshalb war die alte Datei weg) und führt den kompletten Live-E2E aus.
#
# Ausführen:  bash scripts/admin_reset_and_e2e.sh
# Danach:     ssh myvps cat '~/kibuka-admin-credentials.txt'
set -euo pipefail

ssh myvps 'bash -s' <<'REMOTE'
set -e
PW=$(openssl rand -base64 24 | tr -d "/+=" | cut -c1-20)

# Passwort-Hash direkt im Backend-Container setzen (bcrypt wie in der App)
docker exec -e NEW_PW="$PW" -i kibuka-backend python - <<'PY'
import asyncio, os, bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.infrastructure.config import settings

async def main() -> None:
    h = bcrypt.hashpw(os.environ["NEW_PW"].encode(), bcrypt.gensalt(12)).decode()
    eng = create_async_engine(settings.database_url)
    async with eng.begin() as conn:
        r = await conn.execute(
            text("UPDATE users SET hashed_password=:h WHERE email='admin@omarfourati.de'"),
            {"h": h},
        )
        print("RESET: rows updated =", r.rowcount)
        assert r.rowcount == 1, "Admin-User nicht gefunden!"
    await eng.dispose()

asyncio.run(main())
PY

# Credentials ausserhalb von /home/kibuka ablegen (ueberlebt Deploys)
umask 077
printf "Email: admin@omarfourati.de\nPasswort: %s\n" "$PW" > "$HOME/kibuka-admin-credentials.txt"
echo "CREDS: gespeichert in \$HOME/kibuka-admin-credentials.txt (chmod 600)"

# ----- Live-E2E als Admin -----
BASE=https://kibuka.omarfourati.de
BOOK=9f9e0588-73aa-43ac-96a8-e441bcc18da8

RESP=$(curl -s --max-time 20 -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@omarfourati.de\",\"password\":\"$PW\"}")
TOKEN=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
echo "$RESP" | python3 -c "import json,sys; u=json.load(sys.stdin)['user']; print('LOGIN: OK | user:', u['email'], '| role:', u['role'])"

curl -s --max-time 20 -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/books/$BOOK" > /tmp/detail.json
python3 -c "
import json
b=json.load(open('/tmp/detail.json'))
print('DETAIL: is_purchased =', b['is_purchased'], '| cover:', (b['cover_image_url'] or '')[:70])"
COVER=$(python3 -c "import json; print(json.load(open('/tmp/detail.json'))['cover_image_url'] or '')")

curl -s --max-time 20 -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/books/$BOOK/read" > /tmp/read.json
python3 -c "
import json
b=json.load(open('/tmp/read.json')); p=b['pages'][0]; ts=p['word_timestamps']['de']
print('READ:', len(b['pages']), 'Seiten | Sprachen:', sorted(p['texts'].keys()), '| de-Timestamps:', len(ts))
print('READ-TS[0]:', ts[0]['word'], ts[0]['startTime'], '-', ts[0]['endTime'], 'ms')"
AUDIO=$(python3 -c "import json; print(json.load(open('/tmp/read.json'))['pages'][0]['audio_urls']['de'])")
ILLU=$(python3 -c "import json; print(json.load(open('/tmp/read.json'))['pages'][0]['illustration_url'] or '')")
rm -f /tmp/detail.json /tmp/read.json

[ -n "$COVER" ] && curl -s -o /dev/null -w "COVER:    %{http_code} (%{content_type}, %{size_download} B)\n" --max-time 20 "$COVER"
[ -n "$AUDIO" ] && curl -s -o /dev/null -w "AUDIO-DE: %{http_code} (%{content_type}, %{size_download} B)\n" --max-time 20 "$AUDIO"
[ -n "$ILLU" ]  && curl -s -o /dev/null -w "ILLU-1:   %{http_code} (%{content_type}, %{size_download} B)\n" --max-time 20 "$ILLU"
REMOTE
