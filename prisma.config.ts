import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // An empty fallback lets generate/validate/build work without connecting to a DB.
  // All commands that actually connect require DATABASE_URL in the environment.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
