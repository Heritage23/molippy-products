
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";

async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySession(token);

  if (!session || session.role !== "CUSTOMER") {
    return null;
  }

  return session;
}

export async function GET() {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json(
        { message: "Please sign in to view support replies." },
        { status: 401 }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId: session.userId,
      },
      select: {
        id: true,
        subject: true,
        customerLastReadAt: true,
        messages: {
          where: {
            senderRole: "ADMIN",
          },
          select: {
            id: true,
            message: true,
            senderName: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const replies = tickets.flatMap((ticket) =>
      ticket.messages.map((reply) => ({
        id: reply.id,
        ticketId: ticket.id,
        subject: ticket.subject,
        message: reply.message,
        senderName: reply.senderName,
        createdAt: reply.createdAt,
      }))
    );

    const unreadCount = tickets.reduce((total, ticket) => {
      const lastReadAt = ticket.customerLastReadAt;

      const unreadReplies = ticket.messages.filter(
        (reply) =>
          !lastReadAt ||
          reply.createdAt.getTime() > lastReadAt.getTime()
      ).length;

      return total + unreadReplies;
    }, 0);

    return NextResponse.json({
      replies,
      unreadCount,
    });
  } catch (error) {
    console.error("Customer support replies error:", error);

    return NextResponse.json(
      { message: "Unable to load support replies." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json(
        { message: "Please sign in to update support notifications." },
        { status: 401 }
      );
    }

    await prisma.supportTicket.updateMany({
      where: {
        userId: session.userId,
      },
      data: {
        customerLastReadAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Support notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark support replies as read error:", error);

    return NextResponse.json(
      { message: "Unable to update support notifications." },
      { status: 500 }
    );
  }
}
