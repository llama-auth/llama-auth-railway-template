import crypto from "node:crypto";
import { nanoid } from "nanoid";

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createApiKey() {
  const secret = `llama_${nanoid(40)}`;
  return { secret, prefix: secret.slice(0, 14), hash: sha256(secret) };
}
