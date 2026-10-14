import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
async function getLoggedInUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await verifySession(sessionToken);

  if (!session) {
    return null;
  }

  return session;
}

function isValidPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1
  );
}

// GET CART
export async function GET() {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    const cart = await prisma.cart.findUnique({
      where: {
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

    if (!cart) {
      return NextResponse.json({
        cart: null,
        items: [],
      });
    }

    return NextResponse.json({
      cart,
      items: cart.items,
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return NextResponse.json(
      { message: "Unable to load cart." },
      { status: 500 }
    );
  }
}

// ADD TO CART
export async function POST(request: Request) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    const { productId, quantity = 1 } = body as {
      productId?: unknown;
      quantity?: unknown;
    };

    if (typeof productId !== "string" || !productId.trim()) {
      return NextResponse.json(
        { message: "Product ID is required." },
        { status: 400 }
      );
    }

    if (!isValidPositiveInteger(quantity)) {
      return NextResponse.json(
        { message: "Quantity must be a positive whole number." },
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

    if (!product.isActive) {
      return NextResponse.json(
        { message: "This product is unavailable." },
        { status: 400 }
      );
    }

    if (product.stock < 1 || quantity > product.stock) {
      return NextResponse.json(
        { message: "Not enough stock available." },
        { status: 400 }
      );
    }

    let cart = await prisma.cart.findUnique({
      where: {
        userId: session.userId,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.userId,
        },
      });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.stock) {
        return NextResponse.json(
          {
            message: "You cannot add more than the available stock.",
          },
          { status: 400 }
        );
      }

      const updatedItem = await prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: newQuantity,
        },
      });

      return NextResponse.json({
        message: "Cart updated successfully.",
        item: updatedItem,
      });
    }

    const cartItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });

    return NextResponse.json(
      {
        message: "Product added to cart.",
        item: cartItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add to cart error:", error);

    return NextResponse.json(
      { message: "Unable to add product to cart." },
      { status: 500 }
    );
  }
}

// UPDATE CART QUANTITY
export async function PATCH(request: Request) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    const { itemId, quantity } = body as {
      itemId?: unknown;
      quantity?: unknown;
    };

    if (typeof itemId !== "string" || !itemId.trim()) {
      return NextResponse.json(
        { message: "Item ID is required." },
        { status: 400 }
      );
    }

    if (!isValidPositiveInteger(quantity)) {
      return NextResponse.json(
        { message: "Quantity must be a positive whole number." },
        { status: 400 }
      );
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        id: itemId,
      },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Cart item not found." },
        { status: 404 }
      );
    }

    if (item.cart.userId !== session.userId) {
      return NextResponse.json(
        { message: "You cannot modify this cart item." },
        { status: 403 }
      );
    }

    if (!item.product.isActive) {
      return NextResponse.json(
        { message: "This product is unavailable." },
        { status: 400 }
      );
    }

    if (quantity > item.product.stock) {
      return NextResponse.json(
        { message: "Not enough stock available." },
        { status: 400 }
      );
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        id: itemId,
      },
      data: {
        quantity,
      },
    });

    return NextResponse.json({
      message: "Cart updated successfully.",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Update cart error:", error);

    return NextResponse.json(
      { message: "Unable to update cart." },
      { status: 500 }
    );
  }
}

// REMOVE ITEM FROM CART
export async function DELETE(request: Request) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    const { itemId } = body as { itemId?: unknown };

    if (typeof itemId !== "string" || !itemId.trim()) {
      return NextResponse.json(
        { message: "Item ID is required." },
        { status: 400 }
      );
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        id: itemId,
      },
      include: {
        cart: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Cart item not found." },
        { status: 404 }
      );
    }

    if (item.cart.userId !== session.userId) {
      return NextResponse.json(
        { message: "You cannot remove this cart item." },
        { status: 403 }
      );
    }

    await prisma.cartItem.delete({
      where: {
        id: itemId,
      },
    });

    return NextResponse.json({
      message: "Item removed from cart.",
    });
  } catch (error) {
    console.error("Remove cart item error:", error);

    return NextResponse.json(
      { message: "Unable to remove item." },
      { status: 500 }
    );
  }
}
