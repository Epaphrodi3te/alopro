import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@alopro.com";
  const hashed = await bcrypt.hash("Admin@1234", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: "Super",
      lastName: "Admin",
      phone: "+0000000000",
      role: Role.admin,
      password: hashed,
    },
    create: {
      firstName: "Super",
      lastName: "Admin",
      email: adminEmail,
      phone: "+0000000000",
      role: Role.admin,
      password: hashed,
    },
  });

  console.log("Seed complete: admin@alopro.com / Admin@1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
