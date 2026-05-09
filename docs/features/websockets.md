# WebSockets (Echtzeit-Benachrichtigungen)

Bidirektionale Echtzeit-Verbindung für Push-Benachrichtigungen, Live-Updates und Streaming.

---

## Verbindung

```
wss://api.myapp.com/ws/notifications?token=<access_token>
```

Token wird als Query-Parameter übergeben (da WebSocket-Handshake keine Custom Headers erlaubt). Der Token hat dieselbe 15-Minuten-Lebensdauer wie der normale Access Token.

---

## Message-Format

```json
{
  "type": "notification",
  "event": "agent.completed",
  "data": { "run_id": "...", "result": "..." },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

---

## Event-Typen (Server → Client)

| Event                  | Wann                                   |
| ---------------------- | -------------------------------------- |
| `notification`         | Allgemeine Push-Benachrichtigung       |
| `agent.progress`       | Agent-Loop-Fortschritt (pro Iteration) |
| `document.ingested`    | Dokument-Upload abgeschlossen          |
| `subscription.updated` | Plan-Änderung                          |
| `ping`                 | Keep-alive (alle 30s)                  |

---

## Reconnect-Logik (Client)

```typescript
function connectWS(token: string) {
  const ws = new WebSocket(
    `wss://api.myapp.com/ws/notifications?token=${token}`,
  );
  ws.onclose = () => setTimeout(() => connectWS(token), 3000); // Auto-Reconnect
  ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
}
```

---

## Backend (FastAPI)

```python
@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket, token: str):
    user = await verify_token(token)
    await websocket.accept()
    # User in Connection-Manager registrieren
    await manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()  # Ping-Pong
    except WebSocketDisconnect:
        manager.disconnect(user.id)
```

---

## Nginx-Konfiguration

```nginx
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;
}
```

Feature Flag: `ENABLE_WEBSOCKETS=true/false`
