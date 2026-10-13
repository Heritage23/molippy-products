import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "./app/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = "MolippyAdmin123";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: {
      email: "admin@molippy.com",
    },
    data: {
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin password updated successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });