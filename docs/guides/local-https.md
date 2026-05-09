# Local HTTPS Setup

HTTPS is required locally for:

- **Google OAuth 2.0** — Google requires the redirect URI to use HTTPS for non-localhost origins
- **Secure cookies** — `httpOnly` + `Secure` cookies are not sent over plain HTTP
- **Testing production-like behavior** — CSP headers, mixed content, and some browser APIs behave differently over HTTPS

---

## Step 1: Run the Setup Script

```bash
chmod +x scripts/setup-https.sh
./scripts/setup-https.sh
```

This script:

1. Installs `mkcert` if not already installed
2. Installs the local CA into the system trust store
3. Generates a certificate for `myapp.local` and `*.myapp.local`
4. Saves the certificate and key to `deploy/certs/`
5. Configures nginx to serve HTTPS using the generated certificate

The browser will trust this certificate without warnings because `mkcert` installs its CA into the system trust store.

---

## Step 2: Update /etc/hosts (or Windows hosts file)

Add the following line to your hosts file:

**macOS / Linux:** `/etc/hosts`

```
127.0.0.1   myapp.local api.myapp.local
```

**Windows:** `C:\Windows\System32\drivers\etc\hosts` (open as Administrator)

```
127.0.0.1   myapp.local api.myapp.local
```

After saving, verify:

```bash
ping myapp.local   # Should resolve to 127.0.0.1
```

---

## Step 3: Update .env

```bash
# Replace http://localhost URLs with https://myapp.local
APP_URL=https://myapp.local
CORS_ORIGINS=https://myapp.local

# Update OAuth redirect URI
GOOGLE_REDIRECT_URI=https://myapp.local/api/auth/google/callback

# For frontend (.env in apps/frontend/)
VITE_API_URL=https://api.myapp.local
```

---

## Step 4: Update Google Cloud Console

If using Google OAuth, add the new redirect URI to the Google Cloud Console:

1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add `https://myapp.local/api/auth/google/callback`
4. Save

---

## Step 5: Restart the Dev Stack

```bash
./scripts/dev.sh
```

The application is now available at:

- Frontend: https://myapp.local
- Backend API: https://api.myapp.local
- API Docs: https://api.myapp.local/docs

---

## Troubleshooting

### Certificate not trusted (NET::ERR_CERT_AUTHORITY_INVALID)

The mkcert CA was not installed. Run:

```bash
mkcert -install
```

Then restart your browser.

### Certificate not found error in nginx

The certificate files must be at the paths configured in `deploy/nginx/nginx-dev.conf`. Regenerate:

```bash
cd deploy/certs
mkcert myapp.local "*.myapp.local"
```

### hosts file changes not taking effect

On macOS, flush the DNS cache:

```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

On Windows:

```powershell
ipconfig /flushdns
```

### Secure cookies not being sent

Verify:

1. `SESSION_COOKIE_SECURE=true` in `.env`
2. `HTTPS=true` in `.env`
3. You are accessing the site via `https://` not `http://`

---

## CI / GitHub Actions

The HTTPS setup is only for local development. In CI, tests run against `http://localhost` with `HTTPS=false` and the `Secure` cookie flag disabled. This is controlled by the `ENVIRONMENT` variable:

```python
# In settings.py
session_cookie_secure: bool = Field(
    default=True,
    description="Set to false in test/CI environments"
)
```
