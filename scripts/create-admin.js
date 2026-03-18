/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");

const path = require("path");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!dbUrl.startsWith("file:")) {
    return new PrismaClient({ log: ["error", "warn"] });
  }

  const relativePath = dbUrl.replace(/^file:/, "");
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const absoluteUrl = `file:${absolutePath}`;

  const adapter = new PrismaBetterSqlite3({ url: absoluteUrl });
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

const prisma = createPrismaClient();

async function main() {
  const email = "admin@admin.com.br";
  const password = "am99440356";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Usuário admin já existe com e-mail ${email}.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: "Administrador",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Usuário admin criado com sucesso:", {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((err) => {
    console.error("Erro ao criar usuário admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

