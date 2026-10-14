
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
function isValidPaystackSignature(
  body: string,
  signature: string,
  secretKey: string
) {
  const expectedSignature = createHmac("sha512", secretKey)
    .update(body)
    .digest();

  if (!/^[a-fA-F0-9]{128}$/.test(signature)) {
    return false;
  }

  const receivedSignature = Buffer.from(signature, "hex");

  return (
    receivedSignature.length === expectedSignature.length &&
    timingSafeEqual(receivedSignature, expectedSignature)
  );
}

export async function POST(request: Request) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is not configured.");

      return NextResponse.json(
        { message: "Webhook is not configured." },
        { status: 500 }
      );
    }

    // Read the original request body before parsing it.
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (
      !signature ||
      !isValidPaystackSignature(body, signature, secretKey)
    ) {
      return NextResponse.json(
        { message: "Invalid webhook signature." },
        { status: 401 }
      );
    }

    let event: any;

    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    // We only process successful charge notifications.
    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const transaction = event.data;

    if (
      !transaction ||
      transaction.status !== "success" ||
      typeof transaction.reference !== "string" ||
      !transaction.reference.trim() ||
      !Number.isSafeInteger(transaction.amount) ||
      transaction.amount <= 0 ||
      transaction.currency !== "NGN"
    ) {
      return NextResponse.json(
        { message: "Invalid payment details." },
        { status: 400 }
      );
    }

    // Match the Paystack reference to an existing Molippy order.
    const order = await prisma.order.findFirst({
      where: {
        paymentReference: transaction.reference,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      console.error("Webhook order not found:", transaction.reference);

      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 }
      );
    }

    // Both values are in kobo. Do not multiply either value by 100.
    if (order.total !== transaction.amount) {
      console.error("Webhook amount mismatch:", {
        reference: transaction.reference,
        orderTotal: order.total,
        paystackAmount: transaction.amount,
      });

      return NextResponse.json(
        { message: "Payment amount mismatch." },
        { status: 400 }
      );
    }

    // A callback or earlier webhook may already have processed this order.
    if (order.status === "PAID") {
      return NextResponse.json({
        received: true,
        message: "Order already processed.",
      });
    }

    if (order.status !== "PENDING") {
      console.error("Webhook received for an order that is not pending:", {
        orderId: order.id,
        status: order.status,
      });

      // Acknowledge the notification, but do not alter the order.
      return NextResponse.json({
        received: true,
        message: "Order is not pending.",
      });
    }

    await prisma.$transaction(async (tx) => {
      // Claim the order so concurrent notifications cannot process it twice.
      const claim = await tx.order.updateMany({
        where: {
          id: order.id,
          paymentReference: transaction.reference,
          status: "PENDING",
        },
        data: {
          status: "PAID",
        },
      });

      if (claim.count !== 1) {
        throw new Error("ORDER_ALREADY_PROCESSED");
      }

      // Reduce stock only if enough stock is still available.
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

      // Clear the purchasing customer's cart.
      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId: order.userId,
          },
        },
      });
    });

    return NextResponse.json({
      received: true,
      message: "Payment processed successfully.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ORDER_ALREADY_PROCESSED"
    ) {
      // Another callback or webhook has already claimed this order.
      return NextResponse.json({
        received: true,
        message: "Order already processed.",
      });
    }

    console.error("Paystack webhook processing error:", error);

    // Ask Paystack to retry unexpected processing failures.
    return NextResponse.json(
      { message: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
