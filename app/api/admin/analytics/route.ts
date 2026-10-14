import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
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

    const paidOrders = await prisma.order.findMany({
      where: {
        status: "PAID",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const pendingOrders = await prisma.order.count({
      where: {
        status: "PENDING",
      },
    });

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    const totalUnitsSold = paidOrders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + item.quantity,
          0
        ),
      0
    );

    const paidOrderCount = paidOrders.length;

    const averageOrderValue =
      paidOrderCount > 0
        ? Math.round(totalRevenue / paidOrderCount)
        : 0;

    const productSalesMap = new Map<
      string,
      {
        productId: string;
        name: string;
        unitsSold: number;
        revenue: number;
      }
    >();

    for (const order of paidOrders) {
      for (const item of order.items) {
        const existing = productSalesMap.get(
          item.productId
        );

        const itemRevenue = item.price * item.quantity;

        if (existing) {
          existing.unitsSold += item.quantity;
          existing.revenue += itemRevenue;
        } else {
          productSalesMap.set(item.productId, {
            productId: item.productId,
            name: item.product.name,
            unitsSold: item.quantity,
            revenue: itemRevenue,
          });
        }
      }
    }

    const bestSellingProducts = Array.from(
      productSalesMap.values()
    ).sort((a, b) => b.unitsSold - a.unitsSold);

    const revenueByDateMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        orders: number;
      }
    >();

    for (const order of paidOrders) {
      const date = order.createdAt
        .toISOString()
        .split("T")[0];

      const existing = revenueByDateMap.get(date);

      if (existing) {
        existing.revenue += order.total;
        existing.orders += 1;
      } else {
        revenueByDateMap.set(date, {
          date,
          revenue: order.total,
          orders: 1,
        });
      }
    }

    const revenueByDate = Array.from(
      revenueByDateMap.values()
    );

    return NextResponse.json({
      summary: {
        totalRevenue,
        paidOrders: paidOrderCount,
        pendingOrders,
        totalUnitsSold,
        averageOrderValue,
      },

      bestSellingProducts,

      revenueByDate,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);

    return NextResponse.json(
      {
        message: "Unable to load analytics.",
      },
      {
        status: 500,
      }
    );
  }
}