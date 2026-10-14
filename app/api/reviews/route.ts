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

  return verifySession(sessionToken);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required." },
        { status: 400 }
      );
    }

    const reviews = await prisma.review.findMany({
      where: {
        productId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const reviewCount = reviews.length;

    const averageRating =
      reviewCount > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviewCount
        : 0;

    return NextResponse.json({
      reviews,
      reviewCount,
      averageRating: Number(averageRating.toFixed(1)),
    });
  } catch (error) {
    console.error("Get reviews error:", error);

    return NextResponse.json(
      { message: "Unable to load reviews." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in to leave a review." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const productId = body.productId;
    const rating = Number(body.rating);
    const comment =
      typeof body.comment === "string" ? body.comment.trim() : "";

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { message: "Product ID is required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: "Rating must be between 1 and 5 stars." },
        { status: 400 }
      );
    }

    if (!comment || comment.length < 5) {
      return NextResponse.json(
        { message: "Please write a review of at least 5 characters." },
        { status: 400 }
      );
    }

    if (comment.length > 500) {
      return NextResponse.json(
        { message: "Your review must be 500 characters or less." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: session.userId,
          productId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { message: "You have already reviewed this product." },
        { status: 409 }
      );
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        userId: session.userId,
        productId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Your review has been added.",
        review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create review error:", error);

    return NextResponse.json(
      { message: "Unable to submit your review." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getLoggedInUser();

    if (!session) {
      return NextResponse.json(
        { message: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const reviewId = body.reviewId;

    if (!reviewId || typeof reviewId !== "string") {
      return NextResponse.json(
        { message: "Review ID is required." },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      return NextResponse.json(
        { message: "Review not found." },
        { status: 404 }
      );
    }

    if (review.userId !== session.userId) {
      return NextResponse.json(
        { message: "You can only delete your own review." },
        { status: 403 }
      );
    }

    await prisma.review.delete({
      where: {
        id: reviewId,
      },
    });

    return NextResponse.json({
      message: "Review deleted successfully.",
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return NextResponse.json(
      { message: "Unable to delete review." },
      { status: 500 }
    );
  }
}