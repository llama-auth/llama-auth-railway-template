export default async function healthRoutes(app) {
  app.get("/health", async (_req, reply) => {
    try {
      await app.db.query("SELECT 1");
      return { ok: true, service: "llama-auth", database: "ok" };
    } catch {
      return reply.code(503).send({ ok: false, service: "llama-auth", database: "error" });
    }
  });
}
