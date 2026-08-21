import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyJwt from "@fastify/jwt";
import db from "./plugins/db.js";
import auth from "./plugins/auth.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import apiKeyRoutes from "./routes/api-keys.js";

const app = Fastify({
  logger: true,
  trustProxy: process.env.TRUST_PROXY === "true",
  bodyLimit: 1024 * 1024
});

await app.register(helmet);
await app.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(x => x.trim()) : true,
  credentials: true
});
await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute"
});
await app.register(db);
await app.register(auth);

app.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

app.get("/", async () => ({
  name: "Llama Auth",
  version: "1.0.0",
  status: "running"
}));

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(apiKeyRoutes);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error.validation) return reply.code(400).send({ error: "validation_error" });
  return reply.code(error.statusCode || 500).send({
    error: error.statusCode ? error.code || "request_error" : "internal_server_error"
  });
});

const port = Number(process.env.PORT || 3000);
await app.listen({ host: "0.0.0.0", port });
