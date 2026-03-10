import bcrypt from "bcrypt";
import { Department, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@alopro.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? "Admin";
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? "Principal";
  const phone = process.env.SEED_ADMIN_PHONE ?? "+22990000000";
  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      phone,
      role: Role.admin,
      department: Department.software_development,
      password: hashedPassword,
    },
    create: {
      firstName,
      lastName,
      email,
      phone,
      role: Role.admin,
      department: Department.software_development,
      password: hashedPassword,
    },
  });

  console.log("Seed minimal termine.");
  console.log(`Compte admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
