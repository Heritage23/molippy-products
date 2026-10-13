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

// GET — Get the customer's wishlist
export async function GET() {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    let wishlist = await prisma.wishlist.findUnique({
      where: {
        userId: session.userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId: session.userId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });
    }

    return NextResponse.json({
      wishlist,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    return NextResponse.json(
      { message: "Unable to load your wishlist." },
      { status: 500 }
    );
  }
}

// POST — Add a product to the wishlist
export async function POST(request: Request) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in to save products." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = body.productId;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { message: "Product ID is required." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    let wishlist = await prisma.wishlist.findUnique({
      where: {
        userId: session.userId,
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId: session.userId,
        },
      });
    }

    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json({
        message: "Product is already in your wishlist.",
        item: existingItem,
      });
    }

    const item = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(
      {
        message: "Product added to your wishlist.",
        item,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add wishlist item error:", error);

    return NextResponse.json(
      { message: "Unable to add product to wishlist." },
      { status: 500 }
    );
  }
}

// DELETE — Remove a product from the wishlist
export async function DELETE(request: Request) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = body.productId;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { message: "Product ID is required." },
        { status: 400 }
      );
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: {
        userId: session.userId,
      },
    });

    if (!wishlist) {
      return NextResponse.json(
        { message: "Wishlist not found." },
        { status: 404 }
      );
    }

    const item = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Product is not in your wishlist." },
        { status: 404 }
      );
    }

    await prisma.wishlistItem.delete({
      where: {
        id: item.id,
      },
    });

    return NextResponse.json({
      message: "Product removed from your wishlist.",
    });
  } catch (error) {
    console.error("Remove wishlist item error:", error);

    return NextResponse.json(
      { message: "Unable to remove product from wishlist." },
      { status: 500 }
    );
  }
}