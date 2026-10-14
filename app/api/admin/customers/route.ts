import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
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

    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      include: {
        orders: {
          select: {
            total: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const customerData = customers.map((customer) => {
      const paidOrders = customer.orders.filter(
        (order) => order.status === "PAID"
      );

      const totalSpent = paidOrders.reduce(
        (sum, order) => sum + order.total,
        0
      );

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        createdAt: customer.createdAt,
        orderCount: customer.orders.length,
        paidOrderCount: paidOrders.length,
        totalSpent,
      };
    });

    return NextResponse.json(customerData);
  } catch (error) {
    console.error("Admin customers error:", error);

    return NextResponse.json(
      { message: "Unable to load customers." },
      { status: 500 }
    );
  }
}