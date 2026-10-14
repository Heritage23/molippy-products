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

export async function PATCH(
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

    const body = await request.json();

    const adjustment = Number(body.adjustment);

    if (!Number.isInteger(adjustment)) {
      return NextResponse.json(
        {
          message: "Stock adjustment must be a whole number.",
        },
        {
          status: 400,
        }
      );
    }

    if (adjustment === 0) {
      return NextResponse.json(
        {
          message: "Stock adjustment cannot be zero.",
        },
        {
          status: 400,
        }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          message: "Product not found.",
        },
        {
          status: 404,
        }
      );
    }

    const newStock = product.stock + adjustment;

    if (newStock < 0) {
      return NextResponse.json(
        {
          message: `Stock cannot go below zero. Current stock is ${product.stock}.`,
        },
        {
          status: 400,
        }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: {
        id,
      },
      data: {
        stock: newStock,
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });

    return NextResponse.json({
      message: "Stock updated successfully.",
      product: updatedProduct,
      previousStock: product.stock,
      adjustment,
      newStock,
    });
  } catch (error) {
    console.error("Stock adjustment error:", error);

    return NextResponse.json(
      {
        message: "Unable to update stock.",
      },
      {
        status: 500,
      }
    );
  }
}