"""Setzt das GitHub Secret GOOGLE_TTS_CREDENTIALS_JSON aus einer lokalen
Google-Service-Account-Datei.

Der Schlüsselwert wird direkt an `gh` gepipet und erscheint nie auf stdout —
gemäß Unternehmens-Sicherheitsrichtlinie (Tokens nur durch Skripte).
Der am 2026-10-21 im Chat exponierte Key wird aktiv verweigert.
"""

from __future__ import annotations

import glob
import json
import os
import subprocess
import sys

REPO = "omarfourati-dev/Kibuka"
SECRET_NAME = "GOOGLE_TTS_CREDENTIALS_JSON"
COMPROMISED_KEY_ID = "f666092841a18ff11a1ca1e4d347e82f9c1f1d87"
PATTERN = os.path.join(os.path.expanduser("~"), "Downloads", "nth-platform-473111-q1-*.json")


def main() -> None:
    files = sorted(glob.glob(PATTERN), key=os.path.getmtime, reverse=True)
    if not files:
        sys.exit("FEHLER: Keine Datei 'nth-platform-473111-q1-*.json' in Downloads gefunden.")

    path = files[0]
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if data.get("type") != "service_account":
        sys.exit(f"ABBRUCH: {os.path.basename(path)} ist kein Service-Account-JSON.")
    if data.get("private_key_id") == COMPROMISED_KEY_ID:
        sys.exit(
            f"ABBRUCH: {os.path.basename(path)} enthält den KOMPROMITTIERTEN Key.\n"
            "Bitte in der Google-Konsole den alten Key löschen, einen NEUEN "
            "JSON-Key erzeugen und dieses Skript erneut ausführen."
        )

    proc = subprocess.run(
        ["gh", "secret", "set", SECRET_NAME, "-R", REPO],
        input=json.dumps(data),
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        sys.exit(f"FEHLER: gh secret set schlug fehl: {proc.stderr.strip()[:300]}")

    key_suffix = data.get("private_key_id", "")[-6:]
    print(f"OK: {SECRET_NAME} gesetzt aus {os.path.basename(path)} (Key-ID endet auf ...{key_suffix})")
    print("Die JSON-Datei kann jetzt aus Downloads gelöscht werden.")


if __name__ == "__main__":
    main()
