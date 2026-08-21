# Llama Auth Fastify v1

Llama Auth v1 is a production-oriented authentication API foundation for Railway.

## Included

- Fastify 5 / Node.js 20+
- PostgreSQL
- Secure password hashing with bcrypt
- Short-lived JWT access tokens
- Rotating refresh sessions in an HttpOnly cookie
- Signup / login / refresh / logout
- Logout all sessions
- Current-user endpoint
- Change password
- Delete account
- API key creation/list/revocation
- Helmet security headers
- CORS
- Rate limiting
- Railway healthcheck
- SQL migration

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm start`.

Health:
`GET /health`

## Railway

Create a Railway PostgreSQL service and connect its `DATABASE_URL` to the API service. Railway exposes `DATABASE_URL` and related variables for PostgreSQL services.

Set at minimum:
- `DATABASE_URL`
- `LLAMA_AUTH_JWT_SECRET`
- `CORS_ORIGIN`
- `NODE_ENV=production`

Run the migration once:

`npm run db:migrate`

Then deploy the API.

## Important production work still required for a public auth SaaS

This v1 is the core backend foundation, not the complete Auth0/Clerk replacement.

Before public production launch, add and test:
- Email verification delivery
- Password reset email delivery
- OAuth providers and state/PKCE handling
- MFA / TOTP / recovery codes
- Passkeys / WebAuthn
- Organizations / tenants
- Roles and permissions
- Audit logs
- Account linking
- Device/session management UI
- Secret/key rotation
- Background jobs
- Abuse prevention and IP/device risk controls
- Automated tests and migrations
- Monitoring and alerting
- Data retention/privacy controls
