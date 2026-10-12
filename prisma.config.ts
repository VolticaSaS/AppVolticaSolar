import "dotenv/config";
import { defineConfig } from "prisma/config";

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
