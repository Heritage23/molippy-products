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
        { message: "Access denied. Admins only." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product,
    });
  } catch (error) {
    console.error("Get admin product error:", error);

    return NextResponse.json(
      { message: "Unable to load product." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { message: "Access denied. Admins only." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      slug,
      description,
      price,
      stock,
      shade,
      flavor,
      ingredients,
      images,
      categoryId,
      isActive,
    } = body;

    if (!name || !slug || price === undefined || !categoryId) {
      return NextResponse.json(
        {
          message:
            "Name, slug, price and category are required.",
        },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        slug,
        NOT: {
          id,
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          message:
            "Another product already uses this slug.",
        },
        { status: 409 }
      );
    }

    const product = await prisma.product.update({
      where: {
        id,
      },
      data: {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        price: Number(price),
        stock: Number(stock) || 0,
        shade: shade?.trim() || null,
        flavor: flavor?.trim() || null,
        ingredients: ingredients?.trim() || null,
        images: Array.isArray(images) ? images : [],
        categoryId,
        isActive: Boolean(isActive),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Update admin product error:", error);

    return NextResponse.json(
      { message: "Unable to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { message: "Access denied. Admins only." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        orderItems: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    if (product.orderItems.length > 0) {
      return NextResponse.json(
        {
          message:
            "This product has order history and cannot be deleted. You can deactivate it instead.",
        },
        { status: 409 }
      );
    }

    await prisma.product.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Delete admin product error:", error);

    return NextResponse.json(
      { message: "Unable to delete product." },
      { status: 500 }
    );
  }
}
