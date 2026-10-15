import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security/password";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../src/lib/security/password-policy";

loadEnv({ path: [".env.local", ".env"] });

const connectionString = process.env.DATABASE_URL;
const email = process.env.ADMIN_RESET_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_RESET_PASSWORD;
if (!connectionString || !email || !password || !isStrongPassword(password)) {
  throw new Error(`Configura DATABASE_URL, ADMIN_RESET_EMAIL y ADMIN_RESET_PASSWORD. ${PASSWORD_POLICY_MESSAGE}`);
}
if (process.env.RAILWAY_ENVIRONMENT_NAME !== "Development" || process.env.RAILWAY_SERVICE_NAME !== "AppVolticaSolar") {
  throw new Error("El restablecimiento solo se permite desde AppVolticaSolar en Railway Development.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  const rows = await prisma.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`;
  if (rows[0]?.database_name !== "db_voltica_solar") {
    throw new Error("La conexión debe apuntar a db_voltica_solar; no se cambió ninguna contraseña.");
  }
  const user = await prisma.appUser.findFirst({
    where: { email, role: "admin", isActive: true },
    select: { id: true },
  });
  if (!user) {
    throw new Error("No existe un administrador activo con ese correo; no se cambió ninguna contraseña.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.appUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: { id: true },
    });
    await tx.authSession.deleteMany({ where: { userId: user.id } });
    await tx.auditEvent.create({
      data: {
        action: "auth.admin_password_reset",
        entityType: "app_user",
        entityId: user.id,
        metadata: { source: "railway_development_console" },
      },
    });
  });
  console.info("Contraseña restablecida. Al iniciar sesión, el administrador deberá cambiarla.");
} finally {
  await prisma.$disconnect();
}
