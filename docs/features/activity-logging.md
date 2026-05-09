# Activity Logging (Audit Trail)

Jede relevante User-Aktion wird als unveränderlicher Audit-Log-Eintrag gespeichert.

---

## Was wird geloggt

| Aktion                  | Details                           |
| ----------------------- | --------------------------------- |
| `user.login`            | IP, User-Agent, Erfolg/Misserfolg |
| `user.logout`           | —                                 |
| `user.password_changed` | —                                 |
| `user.deleted`          | Wer hat gelöscht (self / admin)   |
| `space.created`         | Space-Name, Slug                  |
| `space.updated`         | Geänderte Felder                  |
| `document.uploaded`     | Dateiname, Größe, Chunk-Anzahl    |
| `document.deleted`      | —                                 |
| `api_key.created`       | Key-Name, Scopes                  |
| `api_key.revoked`       | —                                 |
| `subscription.changed`  | Von-Plan, Zu-Plan                 |
| `webhook.created`       | URL (domain only)                 |
| `admin.action`          | Freiformtext für Admin-Eingriffe  |

---

## Datenmodell

```python
class ActivityLog(Base):
    id: str (UUID)
    user_id: str
    space_id: str | None
    action: str          # "user.login", "document.uploaded", ...
    metadata: dict       # JSON — aktionsspezifische Details
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    # Kein deleted_at — Audit Logs sind immutabel
```

---

## Abfragen

```
GET /api/v1/admin/activity?user_id=&action=&from=&to=&page=1
```

Nur Admin-Zugriff. Paginiert (50 Einträge pro Seite).

---

## Retention

- Audit Logs werden **niemals soft-deleted** (unveränderlich)
- Retention-Period: konfigurierbar, default 2 Jahre
- Bei Account-Löschung: `user_id` wird anonymisiert, Log-Einträge bleiben (für Compliance)

---

## Performance

Activity Logging ist asynchron via ARQ — niemals im Request-Path blockierend. Ein fehlgeschlagener Log-Eintrag bricht die eigentliche Aktion nicht ab.
