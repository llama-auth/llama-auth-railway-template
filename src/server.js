import Fastify from "fastify";
import cors from "@fastify/cors";
import pg from "pg";

const { Pool } = pg;

const app = Fastify({
  logger: true,
  trustProxy: true
});

await app.register(cors, {
  origin: true,
  credentials: true
});

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL || "";
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } }) : null;

app.get("/health", async () => {
  let database = "not_configured";

  if (pool) {
    try {
      await pool.query("SELECT 1");
      database = "ok";
    } catch {
      database = "error";
    }
  }

  return {
    ok: database !== "error",
    service: "llama-auth",
    database,
    environment: process.env.NODE_ENV || "development"
  };
});

app.get("/", async () => ({
  name: "Llama Auth",
  status: "running",
  health: "/health"
}));

app.addHook("onClose", async () => {
  if (pool) await pool.end();
});

await app.listen({
  host: "0.0.0.0",
  port
});
