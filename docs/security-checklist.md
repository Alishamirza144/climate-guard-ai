# Security checklist

- CORS is restricted to configured origins only.
- API keys are stored server-side and hashed before comparison for push subscriptions.
- Headers include HSTS, CSP, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy.
- Validation errors return typed payloads instead of leaking internals.
- Secrets are kept out of tracked files; gitleaks is required in CI.
- HTTPS is required in production and the app avoids exposing secrets in frontend bundles.
