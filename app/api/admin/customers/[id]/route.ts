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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const customer = await prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        orders: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!customer || customer.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          message: "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    const paidOrders = customer.orders.filter(
      (order) => order.status === "PAID"
    );

    const totalSpent = paidOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        createdAt: customer.createdAt,
      },

      stats: {
        totalOrders: customer.orders.length,
        paidOrders: paidOrders.length,
        pendingOrders: customer.orders.filter(
          (order) => order.status === "PENDING"
        ).length,
        totalSpent,
      },

      orders: customer.orders,
    });
  } catch (error) {
    console.error("Admin customer detail error:", error);

    return NextResponse.json(
      {
        message: "Unable to load customer.",
      },
      {
        status: 500,
      }
    );
  }
}