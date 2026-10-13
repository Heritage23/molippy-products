import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/app/generated/prisma/client";
import { verifySession } from "@/lib/session";

const prisma = new PrismaClient();

async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await verifySession(sessionToken);

  if (!session || session.role !== "ADMIN") {
    return null;
  }

  return session;
}

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        {
          message: "Access denied. Admins only.",
        },
        {
          status: 403,
        }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        stock: "asc",
      },
    });

    const inventory = products.map((product) => {
      const inventoryValue = product.price * product.stock;

      let stockStatus = "IN_STOCK";

      if (product.stock === 0) {
        stockStatus = "OUT_OF_STOCK";
      } else if (product.stock <= 5) {
        stockStatus = "LOW_STOCK";
      }

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category.name,
        price: product.price,
        stock: product.stock,
        inventoryValue,
        stockStatus,
      };
    });

    const totalProducts = inventory.length;

    const totalUnits = inventory.reduce(
      (sum, product) => sum + product.stock,
      0
    );

    const totalInventoryValue = inventory.reduce(
      (sum, product) => sum + product.inventoryValue,
      0
    );

    const lowStockProducts = inventory.filter(
      (product) => product.stockStatus === "LOW_STOCK"
    ).length;

    const outOfStockProducts = inventory.filter(
      (product) => product.stockStatus === "OUT_OF_STOCK"
    ).length;

    return NextResponse.json({
      inventory,
      stats: {
        totalProducts,
        totalUnits,
        totalInventoryValue,
        lowStockProducts,
        outOfStockProducts,
      },
    });
  } catch (error) {
    console.error("Admin inventory error:", error);

    return NextResponse.json(
      {
        message: "Unable to load inventory.",
      },
      {
        status: 500,
      }
    );
  }
}