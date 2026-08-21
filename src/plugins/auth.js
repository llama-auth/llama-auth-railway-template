import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

export default fp(async (app) => {
  const secret = process.env.LLAMA_AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("LLAMA_AUTH_JWT_SECRET must be at least 32 characters");

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret,
    sign: { expiresIn: process.env.LLAMA_AUTH_ACCESS_TTL || "15m" }
  });
});
