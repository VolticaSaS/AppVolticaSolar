import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL es obligatorio para ejecutar el seed.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

try {
  // Solo parámetros demostrativos no financieros; nunca crea usuarios ni secretos.
  await prisma.appSetting.upsert({
    where: { settingKey: "simulation_demo_defaults" },
    update: {},
    create: {
      settingKey: "simulation_demo_defaults",
      settingValue: { methodVersion: "preliminary-v1", defaultSystemLossFraction: 0.18 },
      description: "Parámetros demostrativos para simulaciones preliminares.",
    },
  });
} finally {
  await prisma.$disconnect();
}
