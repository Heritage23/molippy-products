import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@/app/generated/prisma/client";
import { verifySession } from "@/lib/session";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { message: "Not logged in." },
        { status: 401 }
      );
    }

    const session = await verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      loggedIn: true,
      user,
    });
  } catch (error) {
    console.error("Session check error:", error);

    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}