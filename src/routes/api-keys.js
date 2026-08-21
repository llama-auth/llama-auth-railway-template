import { createApiKey } from "../utils/crypto.js";

export default async function apiKeyRoutes(app) {
  app.post("/api/v1/api-keys", { onRequest: [app.authenticate] }, async (request, reply) => {
    const name = request.body?.name?.trim();
    if (!name) return reply.code(400).send({ error: "name_required" });

    const { secret, prefix, hash } = createApiKey();
    const result = await app.db.query(
      `INSERT INTO api_keys(user_id,name,key_prefix,key_hash) VALUES($1,$2,$3,$4)
       RETURNING id,name,key_prefix,created_at`,
      [request.user.sub, name, prefix, hash]
    );
    return reply.code(201).send({ key: secret, metadata: result.rows[0] });
  });

  app.get("/api/v1/api-keys", { onRequest: [app.authenticate] }, async (request) => {
    const result = await app.db.query(
      `SELECT id,name,key_prefix,last_used_at,created_at,revoked_at
       FROM api_keys WHERE user_id=$1 ORDER BY created_at DESC`,
      [request.user.sub]
    );
    return { apiKeys: result.rows };
  });

  app.delete("/api/v1/api-keys/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const result = await app.db.query(
      "UPDATE api_keys SET revoked_at=now() WHERE id=$1 AND user_id=$2 RETURNING id",
      [request.params.id, request.user.sub]
    );
    if (!result.rowCount) return reply.code(404).send({ error: "api_key_not_found" });
    return { ok: true };
  });
}
