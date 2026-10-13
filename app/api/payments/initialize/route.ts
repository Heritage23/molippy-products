import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/app/generated/prisma/client";
import { verifySession } from "@/lib/session";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. Authenticate the customer.
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { message: "Your session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    // 2. Validate the request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("orderId" in body) ||
      typeof body.orderId !== "string" ||
      !body.orderId.trim() ||
      body.orderId.length > 100
    ) {
      return NextResponse.json(
        { message: "A valid order ID is required." },
        { status: 400 }
      );
    }

    const orderId = body.orderId.trim();

    // 3. Only allow the owner to pay for their order.
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.userId,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found." },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { message: "This order cannot be paid for." },
        { status: 409 }
      );
    }

    // 4. Database prices are stored in NAIRA.
    // Convert the order total to KOBO for Paystack.
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

    const amountInKobo = order.total;
    const email = order.shippingEmail?.trim();

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          message: "Please provide a valid email address for this order.",
        },
        { status: 400 }
      );
    }

    // 5. Keep the secret key on the server.
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is not configured.");

      return NextResponse.json(
        { message: "Payment service is temporarily unavailable." },
        { status: 500 }
      );
    }

    const reference = `MOLIPPY-${order.id}`;

    // 6. Initialize payment with Paystack.
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          currency: "NGN",
          reference,
          callback_url: `${new URL(request.url).origin}/payment/callback`,
          metadata: {
            orderId: order.id,
            userId: session.userId,
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    let data: {
      status?: boolean;
      message?: string;
      data?: {
        reference?: string;
        authorization_url?: string;
      };
    };

    try {
      data = await paystackResponse.json();
    } catch {
      console.error("Paystack returned an unreadable response.");

      return NextResponse.json(
        { message: "Unable to process the payment response." },
        { status: 502 }
      );
    }

    if (
      !paystackResponse.ok ||
      data.status !== true ||
      !data.data?.reference ||
      !data.data.authorization_url ||
      data.data.reference !== reference
    ) {
      console.error("Paystack initialization failed:", {
        status: paystackResponse.status,
        message: data.message,
      });

      return NextResponse.json(
        { message: data.message || "Unable to initialize your payment." },
        { status: 502 }
      );
    }

    // 7. Save the reference against this order.
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentReference: data.data.reference },
    });

    // 8. Return the authorization URL to the checkout frontend.
    return NextResponse.json({
      message: "Payment initialized successfully.",
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          message:
            "The payment service took too long to respond. Please try again.",
        },
        { status: 504 }
      );
    }

    console.error("Initialize payment error:", error);

    return NextResponse.json(
      { message: "Unable to initialize payment." },
      { status: 500 }
    );
  }
}