
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ ticketId: string }>;
};

async function authorizeAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return {
      error: "You must be logged in.",
      status: 401,
    } as const;
  }

  const session = await verifySession(sessionToken);

  if (!session) {
    return {
      error: "Invalid session.",
      status: 401,
    } as const;
  }

  if (session.role !== "ADMIN") {
    return {
      error: "Access denied. Admins only.",
      status: 403,
    } as const;
  }

  return { session } as const;
}

const validStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.status }
      );
    }

    const { ticketId } = await context.params;
    const body = await request.json().catch(() => null);
    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!message || message.length > 2000) {
      return NextResponse.json(
        {
          message:
            "Reply must contain between 1 and 2000 characters.",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { message: "Support ticket not found." },
        { status: 404 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: auth.session.userId },
      select: { name: true },
    });

    const reply = await prisma.$transaction(async (tx) => {
      const savedMessage = await tx.supportMessage.create({
        data: {
          ticketId,
          senderId: auth.session.userId,
          senderRole: "ADMIN",
          senderName: admin?.name ?? "Molippy Support",
          message,
        },
      });

      if (ticket.status === "OPEN") {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: "IN_PROGRESS" },
        });
      }

      return savedMessage;
    });

    return NextResponse.json(
      {
        message: "Reply saved successfully.",
        reply,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin support reply error:", error);

    return NextResponse.json(
      { message: "Unable to save support reply." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const auth = await authorizeAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.status }
      );
    }

    const { ticketId } = await context.params;
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (
      typeof status !== "string" ||
      !validStatuses.includes(
        status as (typeof validStatuses)[number]
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid status. Choose OPEN, IN_PROGRESS, RESOLVED, or CLOSED.",
        },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: status as (typeof validStatuses)[number],
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Ticket status updated successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Admin support status error:", error);

    return NextResponse.json(
      { message: "Unable to update ticket status." },
      { status: 500 }
    );
  }
}
