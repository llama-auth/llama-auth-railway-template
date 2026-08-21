import bcrypt from "bcryptjs";
import { randomToken, sha256 } from "../utils/crypto.js";

const refreshDays = () => Number(process.env.LLAMA_AUTH_REFRESH_DAYS || 30);
const cookieName = () => process.env.LLAMA_AUTH_COOKIE_NAME || "llama_refresh";

function setRefreshCookie(reply, token) {
  reply.setCookie(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: refreshDays() * 86400
  });
}

function clearRefreshCookie(reply) {
  reply.clearCookie(cookieName(), { path: "/api/v1/auth" });
}

async function issueSession(app, reply, user, request) {
  const accessToken = await reply.jwtSign({ sub: user.id, email: user.email });
  const refreshToken = randomToken(48);
  const expires = new Date(Date.now() + refreshDays() * 86400000);

  await app.db.query(
    `INSERT INTO sessions(user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES($1,$2,$3,$4,$5)`,
    [user.id, sha256(refreshToken), request.headers["user-agent"] || null, request.ip, expires]
  );
  setRefreshCookie(reply, refreshToken);
  return { accessToken, expiresIn: process.env.LLAMA_AUTH_ACCESS_TTL || "15m" };
}

export default async function authRoutes(app) {
  app.post("/api/v1/auth/signup", {
    schema: {
      body: {
        type: "object", required: ["email", "password"],
        properties: {
          email: { type: "string", minLength: 3, maxLength: 320 },
          password: { type: "string", minLength: 8, maxLength: 128 },
          displayName: { type: "string", maxLength: 120 }
        }
      }
    }
  }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    const existing = await app.db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existing.rowCount) return reply.code(409).send({ error: "email_already_registered" });

    const hash = await bcrypt.hash(request.body.password, 12);
    const result = await app.db.query(
      `INSERT INTO users(email,password_hash,display_name) VALUES($1,$2,$3)
       RETURNING id,email,display_name,email_verified_at,created_at`,
      [email, hash, request.body.displayName || null]
    );
    const user = result.rows[0];
    const tokens = await issueSession(app, reply, user, request);
    return reply.code(201).send({ user, ...tokens });
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password;
    if (!email || !password) return reply.code(400).send({ error: "email_and_password_required" });

    const result = await app.db.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    const safeUser = {
      id: user.id, email: user.email, displayName: user.display_name,
      emailVerifiedAt: user.email_verified_at, createdAt: user.created_at
    };
    const tokens = await issueSession(app, reply, safeUser, request);
    return { user: safeUser, ...tokens };
  });

  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const token = request.cookies[cookieName()];
    if (!token) return reply.code(401).send({ error: "refresh_token_missing" });

    const found = await app.db.query(
      `SELECT s.*, u.email FROM sessions s JOIN users u ON u.id=s.user_id
       WHERE s.refresh_token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
      [sha256(token)]
    );
    if (!found.rowCount) {
      clearRefreshCookie(reply);
      return reply.code(401).send({ error: "invalid_refresh_token" });
    }

    await app.db.query("UPDATE sessions SET revoked_at=now() WHERE id=$1", [found.rows[0].id]);
    const user = { id: found.rows[0].user_id, email: found.rows[0].email };
    return issueSession(app, reply, user, request);
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const token = request.cookies[cookieName()];
    if (token) await app.db.query("UPDATE sessions SET revoked_at=now() WHERE refresh_token_hash=$1", [sha256(token)]);
    clearRefreshCookie(reply);
    return { ok: true };
  });

  app.post("/api/v1/auth/logout-all", { onRequest: [app.authenticate] }, async (request, reply) => {
    await app.db.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [request.user.sub]);
    clearRefreshCookie(reply);
    return { ok: true };
  });

  app.get("/api/v1/auth/me", { onRequest: [app.authenticate] }, async (request, reply) => {
    const result = await app.db.query(
      "SELECT id,email,display_name,email_verified_at,created_at,updated_at FROM users WHERE id=$1",
      [request.user.sub]
    );
    if (!result.rowCount) return reply.code(404).send({ error: "user_not_found" });
    return { user: result.rows[0] };
  });

  app.patch("/api/v1/auth/password", { onRequest: [app.authenticate] }, async (request, reply) => {
    const currentPassword = request.body?.currentPassword;
    const newPassword = request.body?.newPassword;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return reply.code(400).send({ error: "invalid_password_request" });
    }

    const result = await app.db.query("SELECT password_hash FROM users WHERE id=$1", [request.user.sub]);
    if (!result.rowCount || !result.rows[0].password_hash || !(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
      return reply.code(401).send({ error: "invalid_current_password" });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await app.db.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2", [hash, request.user.sub]);
    await app.db.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [request.user.sub]);
    return { ok: true };
  });

  app.delete("/api/v1/auth/account", { onRequest: [app.authenticate] }, async (request, reply) => {
    await app.db.query("DELETE FROM users WHERE id=$1", [request.user.sub]);
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });
}
