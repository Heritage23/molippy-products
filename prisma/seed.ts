import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌸 Seeding Molippy database...");

  // Categories
  const lipCare = await prisma.category.upsert({
    where: { slug: "lip-care" },
    update: {},
    create: {
      name: "Lip Care",
      slug: "lip-care",
      description: "Everyday care for soft, healthy-looking lips.",
    },
  });

  const lipGloss = await prisma.category.upsert({
    where: { slug: "lip-gloss" },
    update: {},
    create: {
      name: "Lip Gloss",
      slug: "lip-gloss",
      description: "Glossy lip products for a beautiful finish.",
    },
  });

  const lipScrub = await prisma.category.upsert({
    where: { slug: "lip-scrub" },
    update: {},
    create: {
      name: "Lip Scrub",
      slug: "lip-scrub",
      description: "Gentle lip exfoliation and care.",
    },
  });

  const lipMask = await prisma.category.upsert({
    where: { slug: "lip-mask" },
    update: {},
    create: {
      name: "Lip Mask",
      slug: "lip-mask",
      description: "Nourishing lip care for your routine.",
    },
  });

  const tintedCare = await prisma.category.upsert({
    where: { slug: "tinted-lip-care" },
    update: {},
    create: {
      name: "Tinted Lip Care",
      slug: "tinted-lip-care",
      description: "Lip care with a beautiful touch of colour.",
    },
  });

  // Admin user
  await prisma.user.upsert({
    where: {
      email: "admin@molippy.com",
    },
    update: {},
    create: {
      name: "Molippy Admin",
      email: "admin@molippy.com",
      passwordHash: "CHANGE_THIS_PASSWORD",
      role: "ADMIN",
    },
  });

  // Products
  await prisma.product.upsert({
    where: {
      slug: "molippy-pink-lips-cream",
    },
    update: {},
    create: {
      name: "Molippy Pink Lips Cream",
      slug: "molippy-pink-lips-cream",
      description:
        "A nourishing lip care cream designed to keep lips soft, smooth and cared for.",
      price: 300000,
      stock: 20,
      ingredients: "Add your actual ingredients here",
      images: [],
      categoryId: lipCare.id,
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "molippy-lip-gloss",
    },
    update: {},
    create: {
      name: "Molippy Lip Gloss",
      slug: "molippy-lip-gloss",
      description:
        "A smooth, glossy lip product that adds shine while keeping your lips looking beautiful.",
      price: 250000,
      stock: 20,
      shade: "Clear",
      images: [],
      categoryId: lipGloss.id,
    },
  });

  await prisma.product.upsert({
    where: {
      slug: "molippy-lip-scrub",
    },
    update: {},
    create: {
      name: "Molippy Lip Scrub",
      slug: "molippy-lip-scrub",
      description:
        "A gentle lip scrub for exfoliating and preparing your lips for your lip care routine.",
      price: 250000,
      stock: 15,
      flavor: "Sugar",
      images: [],
      categoryId: lipScrub.id,
    },
  });

  console.log("✅ Molippy database seeded successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });