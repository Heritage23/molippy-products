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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * GET /api/orders
 *
 * Returns only orders belonging to the logged-in customer.
 */
export async function GET() {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Get customer orders error:", error);

    return NextResponse.json(
      { message: "Unable to load your orders." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 *
 * Creates a pending order using the logged-in customer's cart.
 * The total and item prices are calculated on the server.
 */
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

    const {
      shippingName,
      shippingEmail,
      shippingPhone,
      shippingAddress,
    } = body as {
      shippingName?: unknown;
      shippingEmail?: unknown;
      shippingPhone?: unknown;
      shippingAddress?: unknown;
    };

    if (
      !isNonEmptyString(shippingName) ||
      !isNonEmptyString(shippingEmail) ||
      !isNonEmptyString(shippingPhone) ||
      !isNonEmptyString(shippingAddress)
    ) {
      return NextResponse.json(
        { message: "Please complete all delivery information." },
        { status: 400 }
      );
    }

    const name = shippingName.trim();
    const email = shippingEmail.trim();
    const phone = shippingPhone.trim();
    const address = shippingAddress.trim();

    if (name.length > 120) {
      return NextResponse.json(
        { message: "Your name must be 120 characters or less." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email) || email.length > 254) {
      return NextResponse.json(
        { message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (phone.length > 30) {
      return NextResponse.json(
        { message: "Please provide a valid phone number." },
        { status: 400 }
      );
    }

    if (address.length > 1000) {
      return NextResponse.json(
        { message: "Your delivery address is too long." },
        { status: 400 }
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

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { message: "Your cart is empty." },
        { status: 400 }
      );
    }

    for (const item of cart.items) {
      if (!item.product.isActive) {
        return NextResponse.json(
          {
            message: `${item.product.name} is no longer available.`,
          },
          { status: 400 }
        );
      }

      if (
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return NextResponse.json(
          {
            message: `Invalid quantity for ${item.product.name}.`,
          },
          { status: 400 }
        );
      }

      if (item.quantity > item.product.stock) {
        return NextResponse.json(
          {
            message: `Not enough stock available for ${item.product.name}.`,
          },
          { status: 400 }
        );
      }

      if (
        !Number.isSafeInteger(item.product.price) ||
        item.product.price < 0
      ) {
        console.error(
          "Invalid product price for product:",
          item.productId
        );

        return NextResponse.json(
          { message: "Unable to calculate your order total." },
          { status: 500 }
        );
      }
    }

    const total = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    if (!Number.isSafeInteger(total) || total <= 0) {
      return NextResponse.json(
        { message: "Unable to calculate your order total." },
        { status: 400 }
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      // Recheck product availability and stock inside the transaction.
      for (const item of cart.items) {
        const currentProduct = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
          select: {
            isActive: true,
            stock: true,
            price: true,
          },
        });

        if (
          !currentProduct ||
          !currentProduct.isActive ||
          currentProduct.stock < item.quantity ||
          currentProduct.price !== item.product.price
        ) {
          throw new Error("CART_PRODUCT_CHANGED");
        }
      }

      return tx.order.create({
        data: {
          id: crypto.randomUUID(),
          total,
          status: "PENDING",

          shippingName: name,
          shippingEmail: email,
          shippingPhone: phone,
          shippingAddress: address,

          user: {
            connect: {
              id: session.userId,
            },
          },

          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "Order created successfully.",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CART_PRODUCT_CHANGED"
    ) {
      return NextResponse.json(
        {
          message:
            "A product's price or availability has changed. Please refresh your cart and try again.",
        },
        { status: 409 }
      );
    }

    console.error("Create order error:", error);

    return NextResponse.json(
      { message: "Unable to create order." },
      { status: 500 }
    );
  }
}
