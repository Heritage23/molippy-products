"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  shade: string | null;
  flavor: string | null;
  ingredients: string | null;
  images: string[];
  category: {
    name: string;
  };
};

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
};

export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  function redirectToLogin() {
    const destination = `/products/${slug}`;
    router.replace(`/login?next=${encodeURIComponent(destination)}`);
  }

  // Check authentication before loading the product.
  useEffect(() => {
    let cancelled = false;

    async function checkUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            redirectToLogin();
          }
          return;
        }

        const data = await response.json();

        if (!data.user?.id) {
          if (!cancelled) {
            redirectToLogin();
          }
          return;
        }

        if (!cancelled) {
          setCurrentUserId(data.user.id);
          setCurrentUserName(data.user.name || null);
        }
      } catch (error) {
        console.error("User authentication error:", error);

        if (!cancelled) {
          redirectToLogin();
        }
      } finally {
        if (!cancelled) {
          setUserLoading(false);
        }
      }
    }

    checkUser();

    return () => {
      cancelled = true;
    };
  }, [router, slug]);

  // Load product details only after the user is authenticated.
  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        setLoading(true);
        setMessage("");

        const response = await fetch(
          `/api/products/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setMessage(data.message || "Product not found.");
            setProduct(null);
          }
          return;
        }

        if (!cancelled) {
          setProduct(data.product);
          setSelectedImage(0);
          setQuantity(1);
        }
      } catch (error) {
        console.error("Product loading error:", error);

        if (!cancelled) {
          setMessage("Unable to load product.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!userLoading && currentUserId && slug) {
      loadProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [slug, userLoading, currentUserId]);

  // Load customer reviews.
  useEffect(() => {
    let cancelled = false;

    async function loadReviews(productId: string) {
      try {
        setReviewsLoading(true);
        setReviewMessage("");

        const response = await fetch(
          `/api/reviews?productId=${encodeURIComponent(productId)}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          if (!cancelled) {
            redirectToLogin();
          }
          return;
        }

        if (!response.ok) {
          if (!cancelled) {
            setReviewMessage(data.message || "Unable to load reviews.");
          }
          return;
        }

        if (!cancelled) {
          setReviews(data.reviews || []);
          setAverageRating(Number(data.averageRating || 0));
          setReviewCount(Number(data.reviewCount || 0));
        }
      } catch (error) {
        console.error("Reviews loading error:", error);

        if (!cancelled) {
          setReviewMessage("Unable to load reviews.");
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    }

    if (product?.id && currentUserId) {
      loadReviews(product.id);
    }

    return () => {
      cancelled = true;
    };
  }, [product?.id, currentUserId, router, slug]);

  async function addToCart() {
    if (!product || product.stock <= 0 || addingToCart) {
      return;
    }

    try {
      setAddingToCart(true);
      setMessage("");

      const response = await fetch("/api/cart", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        setMessage(data.message || "Unable to add product to cart.");
        return;
      }

      setMessage("Added to your Molippy bag ♡");
    } catch (error) {
      console.error("Add to cart error:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  }

  async function submitReview() {
    if (!product) {
      return;
    }

    setReviewMessage("");

    if (!currentUserId) {
      redirectToLogin();
      return;
    }

    if (rating === 0) {
      setReviewMessage("Please select a star rating.");
      return;
    }

    if (reviewComment.trim().length < 5) {
      setReviewMessage("Please write at least 5 characters.");
      return;
    }

    if (reviewComment.trim().length > 500) {
      setReviewMessage("Your review must be 500 characters or less.");
      return;
    }

    try {
      setSubmittingReview(true);

      const response = await fetch("/api/reviews", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          rating,
          comment: reviewComment.trim(),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        setReviewMessage(data.message || "Unable to submit your review.");
        return;
      }

      const newReview: Review = data.review;

      if (!newReview) {
        setReviewMessage("Your review could not be confirmed. Please refresh and try again.");
        return;
      }

      const newReviewCount = reviewCount + 1;

      const newAverage =
        newReviewCount > 0
          ? (averageRating * reviewCount + rating) / newReviewCount
          : rating;

      setReviews((current) => [newReview, ...current]);
      setReviewCount(newReviewCount);
      setAverageRating(Number(newAverage.toFixed(1)));

      setRating(0);
      setReviewComment("");
      setReviewMessage("Thank you for sharing your experience ♡");
    } catch (error) {
      console.error("Review submission error:", error);
      setReviewMessage("Something went wrong. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function deleteReview(reviewId: string) {
    try {
      setReviewMessage("");

      const deletedReview = reviews.find(
        (review) => review.id === reviewId
      );

      const response = await fetch("/api/reviews", {
        method: "DELETE",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      if (!response.ok) {
        setReviewMessage(data.message || "Unable to delete review.");
        return;
      }

      const newCount = Math.max(0, reviewCount - 1);

      let newAverage = 0;

      if (deletedReview && newCount > 0) {
        newAverage =
          (averageRating * reviewCount - deletedReview.rating) /
          newCount;
      }

      setReviews((current) =>
        current.filter((review) => review.id !== reviewId)
      );

      setReviewCount(newCount);
      setAverageRating(Number(newAverage.toFixed(1)));
      setReviewMessage("Review deleted.");
    } catch (error) {
      console.error("Delete review error:", error);
      setReviewMessage("Unable to delete review.");
    }
  }

  function renderStars(value: number, interactive = false) {
    return (
      <div className="flex items-center gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = interactive
            ? star <= rating
            : star <= Math.round(value);

          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} out of 5`}
                aria-pressed={star === rating}
                className={`flex min-h-11 min-w-9 items-center justify-center text-2xl transition hover:scale-110 sm:min-h-10 sm:min-w-10 ${
                  isActive ? "text-[#ec1677]" : "text-[#e6cbd5]"
                }`}
              >
                ★
              </button>
            );
          }

          return (
            <span
              key={star}
              className={`text-base sm:text-lg ${
                isActive ? "text-[#ec1677]" : "text-[#e6cbd5]"
              }`}
            >
              ★
            </span>
          );
        })}
      </div>
    );
  }

  // Show a loading screen while checking authentication or loading the product.
  if (userLoading || loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-4 py-7 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="h-4 w-28 animate-pulse rounded-full bg-pink-100" />

          <div className="mt-8 grid gap-7 lg:grid-cols-2 lg:gap-12">
            <div className="h-[380px] animate-pulse rounded-[28px] bg-pink-100 sm:h-[520px]" />

            <div className="space-y-5 py-2 sm:py-5">
              <div className="h-4 w-24 animate-pulse rounded-full bg-pink-100" />
              <div className="h-12 w-full animate-pulse rounded-2xl bg-pink-100 sm:h-14 sm:w-3/4" />
              <div className="h-8 w-32 animate-pulse rounded-full bg-pink-100" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-pink-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-5">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-3xl">
            ♡
          </div>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.25em] text-[#ec1677]">
            MOLIPPY PRODUCTS
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#24151d] sm:text-4xl">
            Product not found
          </h1>

          <p className="mt-4 text-sm leading-6 text-[#806b75]">
            {message || "We couldn't find the product you're looking for."}
          </p>

          <a
            href="/products"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#ec1677] px-7 py-3 font-bold text-white transition hover:bg-[#d70f67]"
          >
            Back to shop
          </a>
        </div>
      </main>
    );
  }

  const isSoldOut = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8fb] text-[#24151d]">
      {/* TOP NAV */}
      <div className="sticky top-0 z-40 border-b border-pink-100 bg-white/85 px-4 py-3 backdrop-blur-xl sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <a
            href="/products"
            className="group flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-[#6f5963] transition hover:text-[#ec1677] sm:gap-3"
          >
            <span className="text-lg transition group-hover:-translate-x-1">
              ←
            </span>
            <span>Back to shop</span>
          </a>

          <a
            href="/cart"
            className="flex min-h-11 items-center rounded-full bg-pink-50 px-4 text-sm font-bold text-[#ec1677] transition hover:bg-pink-100 sm:px-5"
          >
            View bag
          </a>
        </div>
      </div>

      {/* PRODUCT */}
      <section className="px-4 py-6 sm:px-8 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* IMAGE AREA */}
            <div>
              <div className="relative overflow-hidden rounded-[28px] bg-[#f7e8ee] sm:rounded-[32px]">
                <div className="absolute left-[-55px] top-[-55px] z-10 h-40 w-40 rounded-full border-[28px] border-white/40" />
                <div className="absolute bottom-[-80px] right-[-60px] z-10 h-56 w-56 rounded-full bg-pink-300/20" />

                <div className="absolute left-4 top-4 z-20 rounded-full bg-[#24151d] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white sm:left-5 sm:top-5 sm:px-4 sm:py-2.5 sm:text-[10px]">
                  Molippy
                </div>

                <div className="relative h-[390px] sm:h-[560px]">
                  {product.images?.length > 0 ? (
                    <img
                      src={product.images[selectedImage] || product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl shadow-sm">
                          ♡
                        </div>

                        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#9b7c88]">
                          MOLIPPY PRODUCTS
                        </p>
                      </div>
                    </div>
                  )}

                  {isSoldOut && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                      <span className="rounded-full bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {product.images && product.images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2.5 sm:mt-4 sm:grid-cols-5 sm:gap-3">
                  {product.images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View product image ${index + 1}`}
                      aria-pressed={selectedImage === index}
                      className={`relative h-20 overflow-hidden rounded-xl border-2 bg-pink-50 transition sm:h-24 sm:rounded-2xl ${
                        selectedImage === index
                          ? "border-[#ec1677]"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-[24px] bg-[#24151d] px-5 py-5 text-white sm:mt-5 sm:rounded-[26px] sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-pink-300 sm:text-[10px]">
                      The Molippy ritual
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-5 sm:leading-normal">
                      Soft lips. Glossy moments. More confidence.
                    </p>
                  </div>

                  <span className="shrink-0 text-2xl sm:text-3xl">♡</span>
                </div>
              </div>
            </div>

            {/* PRODUCT INFORMATION */}
            <div className="lg:pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-pink-100 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#ec1677] sm:text-[10px]">
                  {product.category?.name || "Lip care"}
                </span>

                {!isSoldOut && (
                  <span
                    className={`text-[9px] font-bold uppercase tracking-[0.16em] sm:text-[10px] ${
                      isLowStock ? "text-orange-500" : "text-[#7e6973]"
                    }`}
                  >
                    {isLowStock ? `Only ${product.stock} left` : "In stock"}
                  </span>
                )}
              </div>

              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:mt-5 sm:text-6xl sm:leading-[0.95]">
                {product.name}
              </h1>

              {/* RATING SUMMARY */}
              <a
                href="#reviews"
                className="mt-5 flex min-h-11 w-fit flex-wrap items-center gap-2.5 rounded-full sm:gap-3"
              >
                {renderStars(averageRating)}

                <span className="text-sm font-bold">
                  {averageRating > 0 ? averageRating.toFixed(1) : "No ratings yet"}
                </span>

                <span className="text-sm text-[#8a737d]">
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </span>
              </a>

              <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6 sm:gap-4">
                <p className="text-2xl font-black sm:text-3xl">
                  ₦{(product.price / 100).toLocaleString("en-NG")}
                </p>

                <span className="h-1.5 w-1.5 rounded-full bg-pink-300" />

                <span className="text-sm text-[#8a737d]">
                  Everyday lip care
                </span>
              </div>

              <div className="my-6 h-px bg-pink-100 sm:my-8" />

              <p className="text-sm leading-7 text-[#705d66] sm:text-base sm:leading-8">
                {product.description}
              </p>

              {(product.shade || product.flavor) && (
                <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
                  {product.shade && (
                    <div className="rounded-2xl bg-white p-4 sm:p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a28b95] sm:text-[10px]">
                        Shade
                      </p>
                      <p className="mt-2 font-bold">{product.shade}</p>
                    </div>
                  )}

                  {product.flavor && (
                    <div className="rounded-2xl bg-white p-4 sm:p-5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a28b95] sm:text-[10px]">
                        Flavor
                      </p>
                      <p className="mt-2 font-bold">{product.flavor}</p>
                    </div>
                  )}
                </div>
              )}

              {product.ingredients && (
                <details className="mt-3 overflow-hidden rounded-2xl bg-white sm:mt-4">
                  <summary className="cursor-pointer list-none px-5 py-4 font-bold sm:py-5">
                    <div className="flex items-center justify-between gap-4">
                      <span>Ingredients</span>
                      <span className="text-xl text-[#ec1677]">+</span>
                    </div>
                  </summary>

                  <div className="border-t border-pink-50 px-5 pb-5 pt-4">
                    <p className="text-sm leading-7 text-[#806b75]">
                      {product.ingredients}
                    </p>
                  </div>
                </details>
              )}

              {/* STOCK */}
              <div className="mt-6 sm:mt-8">
                {isSoldOut ? (
                  <div className="rounded-2xl bg-[#f3ecef] px-5 py-4 text-sm font-semibold text-[#806b75]">
                    This product is currently out of stock.
                  </div>
                ) : isLowStock ? (
                  <div className="rounded-2xl bg-orange-50 px-5 py-4 text-sm font-semibold text-orange-600">
                    Almost gone — only {product.stock} available.
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-[#806b75]">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    {product.stock} available
                  </div>
                )}
              </div>

              {!isSoldOut && (
                <div className="mt-6 sm:mt-7">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#8b747e]">
                    Quantity
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex h-14 w-full items-center justify-between rounded-full bg-white px-2 sm:w-auto sm:justify-start">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) => Math.max(1, current - 1))
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full text-xl transition hover:bg-pink-50"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>

                      <span className="w-12 text-center font-bold">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) =>
                            Math.min(product.stock, current + 1)
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full text-xl transition hover:bg-pink-50"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={addingToCart}
                      className="h-14 w-full rounded-full bg-[#ec1677] px-6 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-[#d70f67] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
                    >
                      {addingToCart ? "Adding..." : "Add to Bag  →"}
                    </button>
                  </div>
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className={`mt-4 rounded-2xl px-5 py-4 text-sm font-semibold sm:mt-5 ${
                    message.includes("Added")
                      ? "bg-green-50 text-green-700"
                      : "bg-pink-50 text-[#ec1677]"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-2.5 sm:mt-8 sm:gap-3">
                <div className="rounded-2xl border border-pink-100 bg-white px-2 py-4 text-center sm:px-4">
                  <span className="text-lg">♡</span>
                  <p className="mt-2 text-[10px] font-bold leading-4 text-[#5f4c55] sm:text-xs">
                    Lip care
                  </p>
                </div>

                <div className="rounded-2xl border border-pink-100 bg-white px-2 py-4 text-center sm:px-4">
                  <span className="text-lg">✦</span>
                  <p className="mt-2 text-[10px] font-bold leading-4 text-[#5f4c55] sm:text-xs">
                    Made with care
                  </p>
                </div>

                <div className="rounded-2xl border border-pink-100 bg-white px-2 py-4 text-center sm:px-4">
                  <span className="text-lg">⌁</span>
                  <p className="mt-2 text-[10px] font-bold leading-4 text-[#5f4c55] sm:text-xs">
                    Molippy quality
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section
        id="reviews"
        className="scroll-mt-20 border-t border-pink-100 bg-white px-4 py-12 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-10">
            {/* REVIEW SUMMARY */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#ec1677]">
                Customer love
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:mt-4 sm:text-5xl">
                What the Molippy girls say.
              </h2>

              <div className="mt-6 rounded-[26px] bg-[#fff8fb] p-5 sm:mt-8 sm:rounded-[28px] sm:p-7">
                <div className="flex items-end gap-3 sm:gap-4">
                  <span className="text-5xl font-black sm:text-6xl">
                    {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                  </span>

                  <div className="pb-1 sm:pb-2">
                    {renderStars(averageRating)}
                    <p className="mt-1 text-xs text-[#8a737d] sm:text-sm">
                      Based on {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>

                {reviewCount > 0 && (
                  <div className="mt-5 border-t border-pink-100 pt-5">
                    <p className="text-xs font-semibold leading-5 text-[#8a737d]">
                      Real experiences from customers who have tried Molippy products.
                    </p>
                  </div>
                )}
              </div>

              {/* WRITE REVIEW */}
              <div className="mt-5 rounded-[26px] bg-[#24151d] p-5 text-white sm:mt-6 sm:rounded-[28px] sm:p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-300">
                  Share your experience
                </p>

                <h3 className="mt-3 text-xl font-black sm:text-2xl">
                  {currentUserId ? "Loved it? Tell us." : "Tried it? Tell us."}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/60">
                  Your review helps other Molippy girls choose their perfect lip essential.
                </p>

                {userLoading ? (
                  <div className="mt-6 h-12 animate-pulse rounded-full bg-white/10" />
                ) : !currentUserId ? (
                  <div className="mt-6">
                    <p className="text-sm leading-6 text-white/60">
                      Please log in to share your experience with this product.
                    </p>

                    <a
                      href={`/login?next=${encodeURIComponent(`/products/${slug}`)}`}
                      className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-[#ec1677] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#d70f67]"
                    >
                      Log in to review →
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="mt-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                          Your rating
                        </p>

                        {rating > 0 && (
                          <span className="text-xs font-bold text-pink-300">
                            {rating}/5
                          </span>
                        )}
                      </div>

                      <div className="mt-2">{renderStars(rating, true)}</div>
                    </div>

                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      maxLength={500}
                      placeholder="Tell us what you think..."
                      className="mt-4 min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-pink-300"
                    />

                    <div className="mt-2 text-right text-xs text-white/40">
                      {reviewComment.length}/500
                    </div>

                    <button
                      type="button"
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="mt-4 min-h-12 w-full rounded-full bg-[#ec1677] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#d70f67] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingReview ? "Posting review..." : "Post my review →"}
                    </button>
                  </>
                )}

                {reviewMessage && (
                  <p role="status" className="mt-4 text-sm font-semibold text-pink-200">
                    {reviewMessage}
                  </p>
                )}

                {currentUserName && (
                  <p className="mt-4 text-xs text-white/40">
                    Reviewing as{" "}
                    <span className="font-semibold text-white/60">
                      {currentUserName}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* REVIEW LIST */}
            <div>
              <div className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
                <div>
                  <h3 className="text-xl font-black">Customer reviews</h3>

                  {reviewCount > 0 && (
                    <p className="mt-1 text-xs leading-5 text-[#8a737d] sm:text-sm">
                      {reviewCount}{" "}
                      {reviewCount === 1
                        ? "customer has shared"
                        : "customers have shared"}{" "}
                      their experience.
                    </p>
                  )}
                </div>

                <span className="shrink-0 rounded-full bg-pink-50 px-3.5 py-2 text-xs font-bold text-[#ec1677]">
                  {reviewCount}
                </span>
              </div>

              {reviewsLoading ? (
                <div className="space-y-3 sm:space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="rounded-[24px] bg-[#fff8fb] p-5 sm:rounded-[26px] sm:p-6"
                    >
                      <div className="h-4 w-24 animate-pulse rounded-full bg-pink-100" />
                      <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-pink-100" />
                      <div className="mt-2 h-4 w-3/4 animate-pulse rounded-full bg-pink-100" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-[26px] bg-[#fff8fb] px-5 py-14 text-center sm:rounded-[28px] sm:px-6 sm:py-16">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                    ★
                  </div>

                  <h3 className="mt-5 text-xl font-black">
                    Be the first to review.
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#8a737d]">
                    Your experience could help another customer discover their new Molippy favourite.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-[24px] bg-[#fff8fb] p-5 sm:rounded-[26px] sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-black text-[#ec1677]">
                              {(review.user?.name || "M")[0].toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold">
                                {review.user?.name || "Molippy Customer"}
                              </p>

                              <p className="text-xs text-[#9a818c]">
                                {new Date(review.createdAt).toLocaleDateString("en-NG", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3">{renderStars(review.rating)}</div>
                        </div>

                        {currentUserId === review.user?.id && (
                          <button
                            type="button"
                            onClick={() => deleteReview(review.id)}
                            className="flex min-h-10 shrink-0 items-center px-2 text-xs font-bold text-[#a88d98] transition hover:text-red-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>

                      <p className="mt-4 text-sm leading-7 text-[#705d66]">
                        {review.comment}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM BRAND CTA */}
      <section className="px-4 pb-12 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[30px] bg-[#ec1677] px-5 py-10 text-center text-white sm:rounded-[36px] sm:px-12 sm:py-16">
            <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full border-[35px] border-white/10" />
            <div className="absolute -bottom-20 -right-10 h-52 w-52 rounded-full bg-white/10" />

            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-pink-100">
                MOLIPPY PRODUCTS
              </p>

              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                Where beauty meets confidence.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-pink-50 sm:mt-5 sm:text-base sm:leading-7">
                Keep exploring the Molippy collection and find your everyday lip essentials.
              </p>

              <a
                href="/products"
                className="mt-7 inline-flex min-h-12 items-center rounded-full bg-white px-7 py-4 text-sm font-bold text-[#ec1677] transition hover:bg-[#24151d] hover:text-white sm:mt-8"
              >
                Continue shopping →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#24151d] px-5 py-9 text-white sm:px-8 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black tracking-[-0.03em]">
              MOLIPPY PRODUCTS
            </p>
            <p className="mt-1 text-xs text-white/50">
              Where beauty meets confidence.
            </p>
          </div>

          <div className="flex gap-5 text-sm text-white/60">
            <a href="/" className="transition hover:text-white">
              Home
            </a>

            <a href="/products" className="transition hover:text-white">
              Shop
            </a>

            <a href="/cart" className="transition hover:text-white">
              Cart
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
