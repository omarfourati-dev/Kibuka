# Email Service

Transaktionale E-Mails via SMTP mit Jinja2-Templates — asynchron via ARQ-Queue.

---

## Templates

Alle Templates liegen in `apps/backend/src/adapters/output/email/templates/`:

| Template                      | Wann gesendet                          |
| ----------------------------- | -------------------------------------- |
| `welcome.html`                | Nach Registrierung                     |
| `verify-email.html`           | E-Mail-Verifikation                    |
| `reset-password.html`         | Passwort vergessen                     |
| `subscription-activated.html` | Plan aktiviert                         |
| `subscription-canceled.html`  | Plan gekündigt                         |
| `invoice.html`                | Rechnung / Zahlungsbestätigung         |
| `webhook-disabled.html`       | Webhook nach Circuit-Break deaktiviert |

---

## Template-Struktur

```html
{% extends "base.html" %} {% block content %}
<h1>Willkommen, {{ user.name }}!</h1>
<a href="{{ action_url }}" class="btn">Jetzt starten</a>
{% endblock %}
```

`base.html` enthält Header, Footer, Unsubscribe-Link.

---

## Versand (immer via ARQ)

```python
# In einem Use Case:
await queue.enqueue(
    send_email,
    to=user.email,
    template="welcome",
    context={"user": {"name": user.name}},
)
```

**Niemals direkt aus einem HTTP-Handler E-Mails senden** — immer via ARQ.

---

## Konfiguration

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@myapp.com
SMTP_PASSWORD=...
EMAIL_FROM_NAME=MyApp
EMAIL_FROM_ADDRESS=noreply@myapp.com
```

---

## DSGVO

- Unsubscribe-Link in jeder E-Mail (CAN-SPAM / DSGVO)
- Kein Tracking-Pixel ohne explizite Einwilligung
- E-Mail-Adressen werden bei Account-Löschung anonymisiert
