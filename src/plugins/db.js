import fp from "fastify-plugin";
import pg from "pg";
const { Pool } = pg;

export default fp(async (app) => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 10),
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
  });
  await pool.query("SELECT 1");
  app.decorate("db", pool);
  app.addHook("onClose", async () => pool.end());
});
