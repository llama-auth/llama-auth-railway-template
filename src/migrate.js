import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
});

const sql = await fs.readFile(path.resolve("sql/001_init.sql"), "utf8");
await pool.query(sql);
await pool.end();
console.log("Database migration complete.");
