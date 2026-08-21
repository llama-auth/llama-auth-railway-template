# Llama Auth — Railway Template

Production-oriented Railway starter for Llama Auth.

## Stack
- Node.js
- Fastify
- PostgreSQL
- Railway private networking
- Health check endpoint
- Environment-based configuration

## Deploy architecture

Llama Auth API
        |
        +---- PostgreSQL

The database should be added as a Railway PostgreSQL service and the API should receive
`DATABASE_URL` from the PostgreSQL service.

## Required environment variables

- `DATABASE_URL` — supplied by Railway PostgreSQL
- `NODE_ENV` — `production`
- `PORT` — Railway supplies this automatically; the app listens on `0.0.0.0`
- `LLAMA_AUTH_SECRET` — generate a strong secret before production use

## Health check

`GET /health`

Expected response:

```json
{"ok":true,"service":"llama-auth"}
```

## Important

This repository is the Railway deployment foundation. Replace the example API/auth logic
with the production Llama Auth backend before publishing the public marketplace template.

Do not commit real secrets, OAuth credentials, database passwords, or signing keys.
