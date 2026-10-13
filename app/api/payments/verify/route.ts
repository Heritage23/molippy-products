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

export async function GET(request: Request) {
  try {
    // 1. Require a valid customer session.
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    // 2. Validate the payment reference.
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference || !reference.trim() || reference.length > 200) {
      return NextResponse.json(
        { message: "A valid payment reference is required." },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is not configured.");

      return NextResponse.json(
        { message: "Payment verification is temporarily unavailable." },
        { status: 500 }
      );
    }

    // 3. Find an order belonging to this customer.
    const order = await prisma.order.findFirst({
      where: {
        paymentReference: reference,
        userId: session.userId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order associated with this payment was not found." },
        { status: 404 }
      );
    }

    // 4. Convert the stored naira total to kobo.
    if (
      !Number.isSafeInteger(order.total) ||
      order.total <= 0 ||
      !Number.isSafeInteger(order.total * 100)
    ) {
      console.error("Invalid order total:", order.id);

      return NextResponse.json(
        { message: "This order has an invalid payment amount." },
        { status: 400 }
      );
    }

    const expectedAmountInKobo = order.total;

    // 5. Verify directly with Paystack.
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    let paystackData: {
      status?: boolean;
      message?: string;
      data?: {
        reference?: string;
        status?: string;
        currency?: string;
        amount?: number;
      };
    };

    try {
      paystackData = await paystackResponse.json();
    } catch {
      return NextResponse.json(
        { message: "Paystack returned an unreadable response." },
        { status: 502 }
      );
    }

    if (!paystackResponse.ok || paystackData.status !== true) {
      console.error("Paystack verification failed:", {
        reference,
        message: paystackData.message,
      });

      return NextResponse.json(
        { message: "Unable to verify payment with Paystack." },
        { status: 502 }
      );
    }

    const transaction = paystackData.data;

    if (!transaction || transaction.reference !== reference) {
      return NextResponse.json(
        { message: "Payment reference does not match." },
        { status: 400 }
      );
    }

    if (transaction.status !== "success") {
      return NextResponse.json(
        {
          message: `Payment is not successful. Current status: ${
            transaction.status ?? "unknown"
          }.`,
        },
        { status: 400 }
      );
    }

    if (transaction.currency !== "NGN") {
      console.error("Payment currency mismatch:", {
        reference,
        currency: transaction.currency,
      });

      return NextResponse.json(
        { message: "Payment currency does not match the store." },
        { status: 400 }
      );
    }

    // IMPORTANT: Paystack returns kobo, not naira.
    if (transaction.amount !== expectedAmountInKobo) {
      console.error("Payment amount mismatch:", {
        reference,
        paystackAmount: transaction.amount,
        expectedAmountInKobo,
        orderTotalInNaira: order.total,
      });

      return NextResponse.json(
        { message: "Payment amount does not match the order." },
        { status: 400 }
      );
    }

    // 6. An already-paid order must not deduct stock again.
    if (order.status === "PAID") {
      return NextResponse.json({
        message: "Payment has already been verified.",
        order,
      });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { message: "This order cannot be marked as paid." },
        { status: 409 }
      );
    }

    // 7. Mark paid, deduct stock and clear the cart atomically.
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const claim = await tx.order.updateMany({
        where: {
          id: order.id,
          userId: session.userId,
          paymentReference: reference,
          status: "PENDING",
        },
        data: {
          status: "PAID",
        },
      });

      if (claim.count !== 1) {
        throw new Error("ORDER_ALREADY_PROCESSED");
      }

      for (const item of order.items) {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (stockUpdate.count !== 1) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId: session.userId,
          },
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      message: "Payment verified successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ORDER_ALREADY_PROCESSED"
    ) {
      return NextResponse.json(
        {
          message:
            "This order has already been processed or its status has changed. Please refresh your orders.",
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_STOCK"
    ) {
      console.error(
        "Paystack payment succeeded but stock allocation failed. Manual reconciliation is required."
      );

      return NextResponse.json(
        {
          message:
            "Payment was verified, but stock could not be allocated automatically. Please contact support with your order reference.",
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { message: "Payment verification timed out. Please try again." },
        { status: 504 }
      );
    }

    console.error("Payment verification error:", error);

    return NextResponse.json(
      { message: "Unable to verify payment right now." },
      { status: 500 }
    );
  }
}
