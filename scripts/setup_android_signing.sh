#!/usr/bin/env bash
# Erzeugt EINMALIG einen Android-Signaturschlüssel und legt ihn als GitHub
# Secrets ab (ANDROID_KEYSTORE_B64, ANDROID_KEYSTORE_PASSWORD).
# Schlüssel und Passwort werden nie ausgegeben — nur per Pipe an gh übergeben.
#
# Bricht ab, wenn der Schlüssel schon existiert: ein neuer Schlüssel würde
# Updates bereits installierter APKs unmöglich machen.
#
# Ausführen:  bash scripts/setup_android_signing.sh
set -euo pipefail
export MSYS_NO_PATHCONV=1

REPO="omarfourati-dev/Kibuka"

if gh secret list -R "$REPO" | grep -q '^ANDROID_KEYSTORE_B64'; then
  echo "ANDROID_KEYSTORE_B64 existiert bereits — nichts zu tun."
  exit 0
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
HOST_DIR="$(cygpath -w "$WORK" 2>/dev/null || echo "$WORK")"

PW="$(openssl rand -hex 24)"

docker run --rm -e "KS_PW=$PW" -v "$HOST_DIR:/out" eclipse-temurin:21-jdk sh -c \
  'keytool -genkeypair -keystore /out/kibuka.jks -storetype PKCS12 \
     -alias kibuka -keyalg RSA -keysize 4096 -validity 10000 \
     -storepass "$KS_PW" -keypass "$KS_PW" \
     -dname "CN=Kibuka, O=Omar Fourati, C=DE" >/dev/null 2>&1'

base64 -w0 "$WORK/kibuka.jks" | gh secret set ANDROID_KEYSTORE_B64 -R "$REPO"
printf '%s' "$PW" | gh secret set ANDROID_KEYSTORE_PASSWORD -R "$REPO"
unset PW

echo "OK — Android-Signaturschlüssel erzeugt und als GitHub Secrets gespeichert."
