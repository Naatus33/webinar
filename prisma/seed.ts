/**
 * Cria usuários de demonstração quando o banco está vazio (útil após migrar para Postgres).
 * Rode: npx prisma db seed
 */
import "dotenv/config";
import { hash } from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url || url.startsWith("file:")) {
  console.error("DATABASE_URL deve apontar para PostgreSQL para este seed.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const pwd = await hash("demo1234", 10);

  const users = [
    { email: "admin@demo.local", name: "Admin", role: "ADMIN" as const },
    { email: "gestor@demo.local", name: "Gestor", role: "GERENTE" as const },
    { email: "vendedor@demo.local", name: "Vendedor", role: "VENDEDOR" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        password: pwd,
        role: u.role,
      },
      update: {
        name: u.name,
        password: pwd,
        role: u.role,
      },
    });
    console.log(`OK: ${u.email} (${u.role}) — senha: demo1234`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
