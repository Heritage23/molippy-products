import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/app/generated/prisma/client";
import { verifySession } from "@/lib/session";

const prisma = new PrismaClient();

async function getLoggedInUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return null;
  }

  return verifySession(sessionToken);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Order ID is required." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order,
    });
  } catch (error) {
    console.error("Get customer order error:", error);

    return NextResponse.json(
      { message: "Unable to load your order." },
      { status: 500 }
    );
  }
}