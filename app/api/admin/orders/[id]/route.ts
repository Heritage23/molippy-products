import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
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
                { message: "Invalid session." },
                { status: 401 }
            );
        }

        if (session.role !== "ADMIN") {
            return NextResponse.json(
                { message: "Access denied. Admins only." },
                { status: 403 }
            );
        }

        const { id } = await params;

        const order = await prisma.order.findUnique({
            where: {
                id,
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json(
                { message: "Order not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            order,
        });
    } catch (error) {
        console.error("Admin order details error:", error);

        return NextResponse.json(
            { message: "Unable to load order." },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
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
                { message: "Invalid session." },
                { status: 401 }
            );
        }

        if (session.role !== "ADMIN") {
            return NextResponse.json(
                { message: "Access denied. Admins only." },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const status = body.status;

        const allowedStatuses = [
            "PENDING",
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
        ];

        if (!allowedStatuses.includes(status)) {
            return NextResponse.json(
                { message: "Invalid order status." },
                { status: 400 }
            );
        }
        const order = await prisma.order.update({
            where: {
                id,
            },
            data: {
                status,
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
        return NextResponse.json({
            message: "Order status updated successfully.",
            order,
        });
    } catch (error) {
        console.error("Update order status error:", error);

        return NextResponse.json(
            { message: "Unable to update order status." },
            { status: 500 }
        );
    }
}