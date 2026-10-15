import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security/password";

loadEnv({ path: [".env.local", ".env"] });

const connectionString = process.env.DATABASE_URL;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!connectionString || !email || !password || password.length < 16) {
  throw new Error("Configura DATABASE_URL, BOOTSTRAP_ADMIN_EMAIL y una BOOTSTRAP_ADMIN_PASSWORD de al menos 16 caracteres.");
}
if (process.env.RAILWAY_ENVIRONMENT_NAME !== "Development" || process.env.RAILWAY_SERVICE_NAME !== "AppVolticaSolar") {
  throw new Error("El bootstrap solo se permite desde AppVolticaSolar en Railway Development.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  const rows = await prisma.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`;
  if (rows[0]?.database_name !== "db_voltica_solar") {
    throw new Error("La conexión del bootstrap debe apuntar a db_voltica_solar; no se creó ningún usuario.");
  }
  const existingAdmin = await prisma.appUser.findFirst({ where: { role: "admin" }, select: { id: true } });
  if (existingAdmin) throw new Error("Ya existe un administrador; el bootstrap solo se permite una vez.");
  const existingUser = await prisma.appUser.findFirst({ where: { email }, select: { id: true } });
  if (existingUser) throw new Error("Ese correo ya está registrado.");

  await prisma.$transaction(async (tx) => {
    const user = await tx.appUser.create({
      data: {
        fullName: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administrador Voltica",
        email,
        passwordHash: await hashPassword(password),
        role: "admin",
        mustChangePassword: true,
      },
      select: { id: true },
    });
    await tx.auditEvent.create({
      data: { actorId: user.id, action: "auth.bootstrap_admin", entityType: "app_user", entityId: user.id },
    });
  });
  console.info("Administrador inicial creado. Retira las variables de bootstrap del entorno.");
} finally {
  await prisma.$disconnect();
}
