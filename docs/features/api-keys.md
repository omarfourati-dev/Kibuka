# API Keys

Scoped, rotierbare API Keys für programmatischen Zugriff — pro Tenant, per User.

---

## Konzept

Jeder User kann mehrere API Keys erstellen. Ein Key ist an einen Space (Tenant) gebunden und hat Scopes die definieren was er darf.

```
sk_live_<32-random-bytes-hex>
```

Der Key-Wert wird nur einmal angezeigt (bei Erstellung). In der Datenbank liegt nur der SHA-256-Hash.

---

## Scopes

| Scope          | Erlaubt                               |
| -------------- | ------------------------------------- |
| `ai:read`      | Chat, RAG-Queries ausführen           |
| `ai:write`     | Dokumente hochladen                   |
| `spaces:read`  | Space-Metadaten lesen                 |
| `spaces:write` | Spaces erstellen/bearbeiten           |
| `billing:read` | Subscription-Status lesen             |
| `admin`        | Alle Operationen (nur für Admin-Keys) |

---

## Endpoints

```
POST   /api/v1/api-keys          # Key erstellen
GET    /api/v1/api-keys          # Keys auflisten (ohne Value)
DELETE /api/v1/api-keys/{key_id} # Key widerrufen
```

---

## Authentifizierung via API Key

```http
Authorization: Bearer sk_live_abc123...
```

Der Middleware-Layer:

1. Prüft ob Header mit `sk_live_` beginnt
2. SHA-256-Hash berechnen
3. In `api_keys` Tabelle suchen (nicht revoked, nicht expired)
4. Scope-Check gegen den angeforderten Endpoint
5. User + Space aus Key laden → Request Context setzen

---

## Rotation

Keys können nicht "geändert" werden — nur revoked + neu erstellt. Bei Rotation:

1. Neuen Key erstellen
2. Alten Key in der Anwendung ersetzen
3. Alten Key revoken

---

## Rate Limiting

API Keys unterliegen eigenen Rate Limits: `100 req/min` per Key (konfigurierbar per Scope).
