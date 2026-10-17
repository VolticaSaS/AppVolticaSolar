import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/security/password";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "../src/lib/security/password-policy";

loadEnv({ path: [".env.local", ".env"] });

const connectionString = process.env.DATABASE_URL;
const email = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
const fullName = process.env.OPERATOR_FULL_NAME?.trim();
const password = process.env.OPERATOR_PASSWORD;
const passwordChangeSetting = process.env.OPERATOR_MUST_CHANGE_PASSWORD;
if (passwordChangeSetting && !["true", "false"].includes(passwordChangeSetting)) {
  throw new Error("OPERATOR_MUST_CHANGE_PASSWORD debe ser true o false.");
}
const mustChangePassword = passwordChangeSetting !== "false";
if (!connectionString || !email || !fullName || !password || !isStrongPassword(password)) {
  throw new Error(`Configura DATABASE_URL, OPERATOR_EMAIL, OPERATOR_FULL_NAME y OPERATOR_PASSWORD. ${PASSWORD_POLICY_MESSAGE}`);
}
if (process.env.RAILWAY_ENVIRONMENT_NAME !== "Development" || process.env.RAILWAY_SERVICE_NAME !== "AppVolticaSolar") {
  throw new Error("La creación inicial solo se permite desde AppVolticaSolar en Railway Development.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  const rows = await prisma.$queryRaw<Array<{ database_name: string }>>`SELECT current_database() AS database_name`;
  if (rows[0]?.database_name !== "db_voltica_solar") {
    throw new Error("La conexión debe apuntar a db_voltica_solar; no se creó ninguna cuenta.");
  }
  const existing = await prisma.appUser.findFirst({ where: { email }, select: { id: true } });
  if (existing) throw new Error("Ese correo ya está registrado; no se creó ninguna cuenta.");

  await prisma.$transaction(async (tx) => {
    const user = await tx.appUser.create({
      data: {
        fullName,
        email,
        passwordHash: await hashPassword(password),
        role: "operator",
        mustChangePassword,
      },
      select: { id: true },
    });
    await tx.auditEvent.create({
      data: {
        action: "user.bootstrap_operator",
        entityType: "app_user",
        entityId: user.id,
        metadata: { source: "railway_development_console" },
      },
    });
  });
  console.info(mustChangePassword
    ? `Cuenta operativa creada para ${email}. El usuario deberá cambiar la contraseña al iniciar sesión.`
    : `Cuenta operativa creada para ${email}. Se conservó la contraseña indicada.`);
} finally {
  await prisma.$disconnect();
}
