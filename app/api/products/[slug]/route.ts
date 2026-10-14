import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ slug: string }>;
  }
) {
  try {
    const { slug } = await context.params;

    const product = await prisma.product.findUnique({
      where: {
        slug,
      },
      include: {
        category: true,
      },
    });

    if (!product || !product.isActive) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product,
    });
  } catch (error) {
    console.error("Product details error:", error);

    return NextResponse.json(
      { message: "Unable to load product." },
      { status: 500 }
    );
  }
}
