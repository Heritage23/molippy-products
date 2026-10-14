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
        { message: "Access denied. Admins only." },
        { status: 403 }
      );
    }

    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Admin products error:", error);

    return NextResponse.json(
      { message: "Unable to load products." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { message: "Access denied. Admins only." },
        { status: 403 }
      );
    }

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

    const existingProduct = await prisma.product.findUnique({
      where: {
        slug,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          message: "A product with this slug already exists.",
        },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
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
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      {
        message: "Product created successfully.",
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create admin product error:", error);

    return NextResponse.json(
      { message: "Unable to create product." },
      { status: 500 }
    );
  }
}