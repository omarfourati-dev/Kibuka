# Authentication

## Token Strategy

### Access Tokens

- **Lifetime:** 15 minutes
- **Storage:** JavaScript memory only — never written to `localStorage` or `sessionStorage`
- **Content:** JWT signed with `HS256`, payload includes `sub` (user ID), `space_id`, `role`, `exp`
- **Transmission:** `Authorization: Bearer <token>` header on every authenticated request

Because access tokens are short-lived and memory-only, XSS attacks cannot steal them from storage. The attacker window is limited to the 15-minute lifetime.

### Refresh Tokens

- **Lifetime:** 7 days
- **Storage:** `httpOnly`, `Secure`, `SameSite=Strict` cookie — inaccessible to JavaScript
- **Rotation:** On every `/auth/refresh` call, the old refresh token is invalidated and a new one is issued. Single-use tokens.
- **Revocation:** Stored in the database with a `revoked_at` field. A compromised token can be invalidated server-side.

### Token Refresh Flow

```
Access token expires
        │
        ▼
Client calls POST /auth/refresh
(httpOnly cookie sent automatically by browser)
        │
        ▼
Server validates refresh token (not revoked, not expired)
        │
        ├── Invalid → 401 → redirect to login
        │
        └── Valid → issue new access token + new refresh token
                    return access token in response body
                    set new refresh token cookie
```

---

## Google OAuth 2.0

Implemented via `authlib` with PKCE.

**Flow:**

1. `GET /auth/google` — server generates state parameter, redirects to Google's authorization endpoint
2. User consents on Google's UI
3. Google redirects to `GET /auth/google/callback?code=...&state=...`
4. Server exchanges code for Google tokens, fetches user profile
5. Server upserts the user record (create on first login, update on subsequent)
6. Server issues access token (response body) + refresh token (httpOnly cookie)
7. Client redirected to `/` with access token

The `state` parameter is validated to prevent CSRF. The callback URL must be whitelisted in the Google Cloud Console and in `GOOGLE_REDIRECT_URI`.

---

## Rate Limiting

Authentication endpoints have stricter rate limits than general API endpoints:

| Endpoint              | Limit                   |
| --------------------- | ----------------------- |
| `POST /auth/login`    | 10 requests/min per IP  |
| `POST /auth/register` | 5 requests/min per IP   |
| `POST /auth/refresh`  | 30 requests/min per IP  |
| General API           | 100 requests/min per IP |

Rate limiting uses `slowapi` backed by Redis. Limits are configurable via environment variables.

Response when limit is exceeded: `429 Too Many Requests` with `Retry-After` header.

---

## Security Headers

All responses include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## GDPR Compliance

### Account Deletion

`DELETE /users/me` performs a soft delete:

1. Sets `user.deleted_at = now()`
2. Anonymizes PII fields: name → "Deleted User", email → `deleted_{uuid}@deleted.invalid`
3. Revokes all active refresh tokens
4. Enqueues an ARQ job to purge associated data after the retention period (configurable, default 30 days)
5. Returns `204 No Content`

The user cannot log in after deletion. The account record is retained (anonymized) for accounting and audit purposes for the retention period.

### Data Export

`GET /users/me/export` returns a JSON file containing all personal data associated with the account:

- Profile information
- Conversation history
- Uploaded documents (metadata, not content)
- Billing history (invoice references, not full card data)
- Audit log entries for the user's actions

The export is generated asynchronously via ARQ and delivered as a download link sent to the user's email address (to prevent unauthorized data export via XSS).

---

## Environment Variables

| Variable                      | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| `SECRET_KEY`                  | JWT signing key — generate with `openssl rand -hex 32` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: `15`                                          |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | Default: `7`                                           |
| `GOOGLE_CLIENT_ID`            | From Google Cloud Console                              |
| `GOOGLE_CLIENT_SECRET`        | From Google Cloud Console                              |
| `GOOGLE_REDIRECT_URI`         | Must match Google Cloud Console whitelist              |
| `CORS_ORIGINS`                | Comma-separated list of allowed frontend origins       |
