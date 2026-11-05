import { z } from "zod";

const databaseEnvironment = z.object({
  DATABASE_URL: z.string().min(1).startsWith("postgres"),
});

export function getDatabaseUrl(): string {
  const parsed = databaseEnvironment.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("DATABASE_URL is required to access application data.");
  }
  return parsed.data.DATABASE_URL;
}
