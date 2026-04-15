2FA API server (development)

Files added:
- `api-server.js` - Express server providing `/api/send-2fa` and `/api/verify-2fa`.
- `package.json` - minimal manifest with dependencies.

Install & run (Windows PowerShell):

# Install dependencies
npm install

# Run server
$env:PORT = 3001; npm start

By default the server runs in "test mode" (no SMTP). It will return the generated 6-digit code in the `/api/send-2fa` JSON response which the client page will display in the `loginStatus` for testing.

To send real emails, set the following environment variables before starting the server:
- SMTP_HOST (e.g. smtp.gmail.com)
- SMTP_PORT (optional, default 587)
- SMTP_SECURE ('true' or 'false')
- SMTP_USER (username/email)
- SMTP_PASS (password or app-specific password)
- SMTP_FROM (optional 'from' address)

Example (PowerShell):
$env:SMTP_HOST = 'smtp.example.com'; $env:SMTP_USER = 'user@example.com'; $env:SMTP_PASS = 'yourpass'; npm start

Security note:
- This server uses an in-memory store for codes and is intended for development/testing only. For production, persist codes securely (e.g. database with TTL), rate-limit requests, and integrate provider-safe sending.

Client integration:
- The `counselor_login.html` page has been updated to call `/api/send-2fa` and `/api/verify-2fa` on the same origin. Ensure the API server is reachable from where the HTML is served (same host/port or configure CORS/proxy as needed).