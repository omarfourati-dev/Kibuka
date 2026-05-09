# Outgoing Webhooks

Per-Tenant Webhook-Subscriptions: Wenn Events passieren, sendet das System HTTP-POSTs an konfigurierte URLs.

---

## Event-Typen

| Event                    | Payload                                |
| ------------------------ | -------------------------------------- |
| `user.created`           | `{id, email, space_id, created_at}`    |
| `user.deleted`           | `{id, space_id, deleted_at}`           |
| `subscription.activated` | `{space_id, plan, period_end}`         |
| `subscription.canceled`  | `{space_id, canceled_at}`              |
| `document.ingested`      | `{document_id, space_id, chunk_count}` |
| `agent.completed`        | `{run_id, space_id, task, result}`     |

---

## Endpoints

```
POST   /api/v1/webhooks          # Webhook registrieren
GET    /api/v1/webhooks          # Webhooks auflisten
DELETE /api/v1/webhooks/{id}     # Webhook entfernen
POST   /api/v1/webhooks/{id}/test # Test-Ping senden
```

---

## Sicherheit

Jeder ausgehende Request enthält einen HMAC-SHA256-Signature-Header:

```
X-Webhook-Signature: sha256=<hmac-hex>
X-Webhook-Timestamp: 1700000000
```

Empfänger sollten die Signatur mit dem konfigurierten Secret verifizieren und Timestamps >5 Minuten ablehnen.

---

## Zuverlässigkeit

- **ARQ-Queue**: Webhook-Delivery läuft als Background-Job (niemals synchron)
- **Retry**: 3 Versuche mit exponential backoff (1min, 5min, 30min)
- **Circuit Breaker**: Nach 5 Fehlern in 10 Minuten → Webhook deaktiviert, User benachrichtigt
- **Timeout**: 30 Sekunden pro Versuch
- **Idempotency**: Jedes Event hat eine `event_id` — Empfänger sollten Duplikate filtern

---

## Delivery Log

Letzte 100 Deliveries werden gespeichert (Status, Response Code, Response Body, Timestamp). Einsehbar via `/api/v1/webhooks/{id}/deliveries`.
