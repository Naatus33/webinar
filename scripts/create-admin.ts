import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@admin.com.br";
  const password = "am99440356";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Usuário admin já existe com e-mail ${email}.`);
    return;
  }

  const passwordHash = await hash(password, 10);

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

