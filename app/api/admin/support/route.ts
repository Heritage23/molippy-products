
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export const runtime = "nodejs";

async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return { error: "You must be logged in.", status: 401 };
  }

  const session = await verifySession(sessionToken);

  if (!session) {
    return { error: "Invalid session.", status: 401 };
  }

  if (session.role !== "ADMIN") {
    return { error: "Access denied. Admins only.", status: 403 };
  }

  return { session };
}

export async function GET() {
  try {
    const auth = await getAdminSession();

    if ("error" in auth) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.status }
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Admin support tickets error:", error);

    return NextResponse.json(
      { message: "Unable to load support tickets." },
      { status: 500 }
    );
  }
}
