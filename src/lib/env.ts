import { z } from "zod";

const databaseEnvironment = z.object({
  DATABASE_URL: z.string().min(1).startsWith("postgres"),
  DATABASE_NAME: z.string().regex(/^[a-z][a-z0-9_]*$/i).optional(),
});

export function getDatabaseUrl(): string {
  const parsed = databaseEnvironment.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("DATABASE_URL is required to access application data.");
  }
  const url = new URL(parsed.data.DATABASE_URL);
  if (parsed.data.DATABASE_NAME) url.pathname = `/${parsed.data.DATABASE_NAME}`;
  return url.toString();
}
