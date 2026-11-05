import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: [".env.local", ".env"] });

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (databaseUrl && process.env.DATABASE_NAME) {
  if (!/^[a-z][a-z0-9_]*$/i.test(process.env.DATABASE_NAME)) {
    throw new Error("DATABASE_NAME must contain only letters, numbers, and underscores.");
  }
  databaseUrl.pathname = `/${process.env.DATABASE_NAME}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // An empty fallback lets generate/validate/build work without connecting to a DB.
  // All commands that actually connect require DATABASE_URL in the environment.
  datasource: {
    url: databaseUrl?.toString() ?? "",
  },
});
