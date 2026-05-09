# Feature Flags

Feature Flags ermöglichen das sichere Aktivieren und Deaktivieren von Features pro Deployment und pro Tenant — ohne Code-Deployment.

---

## Umgebungsvariablen (globale Flags)

| Variable                | Default | Beschreibung                                   |
| ----------------------- | ------- | ---------------------------------------------- |
| `ENABLE_AI`             | `true`  | AI-Chat-Endpunkte aktivieren                   |
| `ENABLE_RAG`            | `true`  | Retrieval-Augmented Generation                 |
| `ENABLE_AGENTS`         | `true`  | ReAct-Agents mit Tool-Calling                  |
| `ENABLE_BILLING`        | `false` | Stripe-Billing (erst wenn Preise konfiguriert) |
| `ENABLE_MULTI_TENANT`   | `true`  | Row-Level-Isolation nach Space/Tenant          |
| `ENABLE_WEBSOCKETS`     | `true`  | WebSocket-Verbindungen für Echtzeit            |
| `ENABLE_AI_CODE_EDITOR` | `false` | AI-Code-Editor im Admin-Panel                  |

---

## Verwendung im Backend

```python
from src.infrastructure.config import settings
from fastapi import HTTPException

@router.post("/ai/chat")
async def chat(body: ChatRequest):
    if not settings.ENABLE_AI:
        raise HTTPException(status_code=404, detail="Feature not available")
    ...
```

Flags immer als erste Zeile im Handler prüfen — vor Auth, vor Validation.

---

## Tenant-Level Flags (Datenbank)

Zusätzlich zu globalen Env-Flags können Flags pro Tenant in der Datenbank gespeichert werden:

```python
class SpaceFeatureFlag(Base):
    space_id: str
    flag_name: str        # z.B. "ENABLE_AGENTS"
    enabled: bool
    updated_at: datetime
```

Priorität: **Tenant-Flag überschreibt globalen Env-Flag** (wenn globaler Flag `true` ist).

---

## Neuen Flag hinzufügen

1. `ENABLE_MYFEATURE=false` in `.env.example` + `project.config.yaml` ergänzen
2. `settings.ENABLE_MYFEATURE: bool = False` in `config.py`
3. Flag am Endpoint prüfen (erste Zeile)
4. Flag in `CLAUDE.md` Feature-Flag-Tabelle ergänzen
5. Alembic Migration falls Datenbank-Spalte nötig
