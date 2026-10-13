import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/app/generated/prisma/client";
import { verifySession } from "@/lib/session";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { message: "Invalid session." },
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Access denied. Admins only." },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        total: true,
        status: true,
        shippingName: true,
        shippingEmail: true,
        createdAt: true,
      },
    });

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
      orderBy: {
        stock: "asc",
      },
    });

    const lowStockProducts = products.filter(
      (product) => product.stock <= 5
    );

    const totalOrders = orders.length;

    const paidOrders = orders.filter(
      (order) => order.status === "PAID"
    ).length;

    const pendingOrders = orders.filter(
      (order) => order.status === "PENDING"
    ).length;

    const totalSales = orders
      .filter((order) => order.status === "PAID")
      .reduce(
        (sum, order) => sum + order.total,
        0
      );

    return NextResponse.json({
      orders,

      stats: {
        totalOrders,
        paidOrders,
        pendingOrders,
        totalSales,
      },

      inventory: {
        products,
        lowStockProducts,
      },
    });
  } catch (error) {
    console.error("Admin orders error:", error);

    return NextResponse.json(
      { message: "Unable to load admin dashboard." },
      { status: 500 }
    );
  }
}