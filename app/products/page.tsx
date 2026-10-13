"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  shade: string | null;
  flavor: string | null;
  images: string[];
  category: {
    name: string;
  };
};

type ReviewSummary = {
  productId: string;
  averageRating: number;
  reviewCount: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reviewSummaries, setReviewSummaries] = useState<
    Record<string, ReviewSummary>
  >({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products");
        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Unable to load products.");
          return;
        }

        setProducts(data);
      } catch (error) {
        console.error(error);
        setMessage("Unable to load products.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    async function loadWishlist() {
      try {
        const response = await fetch("/api/wishlist");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        const ids =
          data.wishlist?.items?.map(
            (item: { productId: string }) => item.productId
          ) || [];

        setWishlistIds(ids);
      } catch (error) {
        console.error("Wishlist loading error:", error);
      }
    }

    loadWishlist();
  }, []);

  useEffect(() => {
    async function loadReviewSummaries() {
      if (products.length === 0) {
        return;
      }

      try {
        const results = await Promise.all(
          products.map(async (product) => {
            try {
              const response = await fetch(
                `/api/reviews?productId=${encodeURIComponent(product.id)}`
              );

              if (!response.ok) {
                return null;
              }

              const data = await response.json();

              const reviews = Array.isArray(data.reviews)
                ? data.reviews
                : [];

              if (reviews.length === 0) {
                return {
                  productId: product.id,
                  averageRating: 0,
                  reviewCount: 0,
                };
              }

              const totalRating = reviews.reduce(
                (sum: number, review: { rating: number }) =>
                  sum + review.rating,
                0
              );

              return {
                productId: product.id,
                averageRating: totalRating / reviews.length,
                reviewCount: reviews.length,
              };
            } catch (error) {
              console.error(
                `Review loading error for ${product.name}:`,
                error
              );

              return null;
            }
          })
        );

        const summaries: Record<string, ReviewSummary> = {};

        results.forEach((summary) => {
          if (summary) {
            summaries[summary.productId] = summary;
          }
        });

        setReviewSummaries(summaries);
      } catch (error) {
        console.error("Review summaries loading error:", error);
      }
    }

    loadReviewSummaries();
  }, [products]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category.name))
    );

    return ["All", ...uniqueCategories];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" ||
        product.category.name === activeCategory;

      if (!normalizedSearch) {
        return matchesCategory;
      }

      const searchableText = [
        product.name,
        product.description,
        product.category.name,
        product.flavor,
        product.shade,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const getBadge = (index: number) => {
    const badges = ["BESTSELLER", "GLOSSY FAV", "LIP RITUAL", "NEW IN"];

    return badges[index % badges.length];
  };

  function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;

      return (
        <span
          key={starNumber}
          className={
            starNumber <= Math.round(rating)
              ? "text-[#ec1677]"
              : "text-[#ead6df]"
          }
        >
          ★
        </span>
      );
    });
  }

  async function toggleWishlist(productId: string) {
    if (wishlistLoading === productId) {
      return;
    }

    setWishlistLoading(productId);

    const isSaved = wishlistIds.includes(productId);

    try {
      const response = await fetch("/api/wishlist", {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        console.error(data.message || "Wishlist action failed.");
        return;
      }

      if (isSaved) {
        setWishlistIds((current) =>
          current.filter((id) => id !== productId)
        );
      } else {
        setWishlistIds((current) => [...current, productId]);
      }
    } catch (error) {
      console.error("Wishlist action error:", error);
    } finally {
      setWishlistLoading(null);
    }
  }

  function clearSearch() {
    setSearchQuery("");
  }

  function clearFilters() {
    setSearchQuery("");
    setActiveCategory("All");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-4 py-12 sm:px-5 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 sm:mb-12">
            <div className="h-3 w-24 animate-pulse rounded-full bg-pink-100" />

            <div className="mt-5 h-12 w-72 max-w-full animate-pulse rounded-2xl bg-pink-100" />

            <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded-full bg-pink-100" />
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-[28px] bg-white"
              >
                <div className="h-[280px] animate-pulse bg-pink-50 sm:h-[330px]" />

                <div className="space-y-4 p-6">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-pink-100" />

                  <div className="h-6 w-40 animate-pulse rounded-full bg-pink-100" />

                  <div className="h-4 w-24 animate-pulse rounded-full bg-pink-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-5">
        <div className="max-w-lg text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-pink-500">
            MOLIPPY PRODUCTS
          </p>

          <h1 className="text-4xl font-black tracking-tight text-[#24151d]">
            Something went wrong.
          </h1>

          <p className="mt-4 text-[#76656d]">{message}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 rounded-full bg-[#ec1677] px-7 py-3 font-bold text-white transition hover:bg-[#d70f67]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8fb] text-[#24151d]">
      {/* HERO */}
      <section className="relative px-4 pb-8 pt-8 sm:px-8 sm:pb-14 sm:pt-16">
        <div className="absolute -right-32 top-10 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />

        <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-end gap-7 sm:gap-10 lg:grid-cols-[1fr_420px]">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-[1px] w-10 bg-[#ec1677]" />

                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#ec1677]">
                  The Lip Edit
                </p>
              </div>

              <h1 className="max-w-4xl text-[3.25rem] font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                Your lips,
                <br />
                <span className="text-[#ec1677]">but better.</span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-6 text-[#76656d] sm:mt-7 sm:text-lg sm:leading-7">
                Everyday lip care made for soft lips, glossy moments and
                effortless confidence. Welcome to the Molippy Products edit.
              </p>
            </div>

            <div className="relative lg:pb-2">
              <div className="rounded-[26px] bg-[#24151d] p-6 text-white sm:rounded-[30px] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-300">
                  Molippy girl rule
                </p>

                <p className="mt-3 text-xl font-bold leading-tight sm:mt-4 sm:text-3xl">
                  Never leave the house without taking care of your lips.
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4 sm:mt-7 sm:pt-5">
                  <span className="text-sm text-white/60">
                    Beauty meets confidence.
                  </span>

                  <span className="text-2xl">♡</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section className="px-4 pb-5 sm:px-8 sm:pb-6">
        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
              <svg
                className="h-5 w-5 text-[#9b7c88]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search lip cream, gloss, scrub..."
              aria-label="Search products"
              className="h-14 w-full rounded-[20px] border border-pink-100 bg-white pl-14 pr-14 text-sm font-medium text-[#24151d] outline-none transition placeholder:text-[#a8929b] focus:border-[#ec1677] focus:ring-4 focus:ring-pink-100 sm:h-16 sm:rounded-[22px]"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-pink-50 text-lg text-[#705761] transition hover:bg-pink-100 hover:text-[#ec1677]"
              >
                ×
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="mt-3 px-1 text-sm text-[#8a737d]">
              Searching for{" "}
              <span className="font-bold text-[#24151d]">
                “{searchQuery}”
              </span>
            </p>
          )}
        </div>
      </section>

      {/* CATEGORY FILTER */}
      <section className="border-y border-pink-100 bg-white/70 px-4 py-3 backdrop-blur sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a818c] sm:mr-2 sm:text-xs">
            Shop
          </span>

          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 ${
                  isActive
                    ? "bg-[#ec1677] text-white shadow-lg shadow-pink-200"
                    : "bg-pink-50 text-[#705761] hover:bg-pink-100"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="px-4 py-12 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:mb-10 sm:gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ec1677]">
                Shop the collection
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:mt-3 sm:text-5xl">
                Pick your lip mood.
              </h2>
            </div>

            <div className="text-sm text-[#8a737d]">
              <p>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"}{" "}
                {searchQuery || activeCategory !== "All"
                  ? "found"
                  : "in the edit"}
              </p>

              {(searchQuery || activeCategory !== "All") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 font-bold text-[#ec1677] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-[28px] bg-white px-5 py-16 text-center sm:rounded-[32px] sm:px-6 sm:py-20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-2xl">
                🔍
              </div>

              <h3 className="mt-6 text-2xl font-bold">
                No products found.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8a737d]">
                We couldn't find anything matching your search. Try another
                product name, category, flavour or shade.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full bg-[#ec1677] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#d70f67]"
              >
                View everything
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filteredProducts.map((product, index) => {
                const isSoldOut = product.stock <= 0;

                const isLowStock =
                  product.stock > 0 && product.stock <= 5;

                const isWishlisted = wishlistIds.includes(product.id);

                const isWishlistButtonLoading =
                  wishlistLoading === product.id;

                const reviewSummary = reviewSummaries[product.id];

                return (
                  <article
                    key={product.id}
                    className="group relative overflow-hidden rounded-[24px] bg-white transition duration-500 sm:hover:-translate-y-2 sm:hover:shadow-[0_25px_70px_rgba(236,22,119,0.12)]"
                  >
                    {/* PRODUCT IMAGE */}
                    <div className="relative block overflow-hidden">
                      <a
                        href={`/products/${product.slug}`}
                        className="relative block"
                      >
                        <div className="relative h-[270px] overflow-hidden bg-[#f8e9ef] sm:h-[350px]">
                          {/* Decorative shape */}
                          <div className="absolute left-[-35px] top-[-35px] h-32 w-32 rounded-full border-[22px] border-white/40" />

                          <div className="absolute bottom-[-60px] right-[-40px] h-48 w-48 rounded-full bg-pink-300/20" />

                          {/* Product number */}
                          <div className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-xs font-bold backdrop-blur sm:left-5 sm:top-5 sm:h-10 sm:w-10">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          {/* Badge */}
                          <div className="absolute right-4 top-4 z-10 rounded-full bg-[#24151d] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white sm:right-5 sm:top-5">
                            {getBadge(index)}
                          </div>

                          {product.images?.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <div className="text-center">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
                                  ♡
                                </div>

                                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#9b7c88]">
                                  Molippy
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Stock overlay */}
                          {isSoldOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
                              <span className="rounded-full bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[#24151d]">
                                Sold Out
                              </span>
                            </div>
                          )}
                        </div>
                      </a>

                      {/* WISHLIST BUTTON */}
                      <button
                        type="button"
                        aria-label={
                          isWishlisted
                            ? `Remove ${product.name} from wishlist`
                            : `Add ${product.name} to wishlist`
                        }
                        aria-pressed={isWishlisted}
                        disabled={isWishlistButtonLoading}
                        onClick={() => toggleWishlist(product.id)}
                        className={`absolute bottom-4 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-xl shadow-lg backdrop-blur transition duration-300 hover:scale-110 sm:bottom-5 sm:right-5 ${
                          isWishlisted
                            ? "text-[#ec1677]"
                            : "text-[#24151d] hover:text-[#ec1677]"
                        } ${
                          isWishlistButtonLoading
                            ? "cursor-wait opacity-60"
                            : ""
                        }`}
                      >
                        {isWishlistButtonLoading ? (
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-pink-200 border-t-[#ec1677]" />
                        ) : isWishlisted ? (
                          "♥"
                        ) : (
                          "♡"
                        )}
                      </button>
                    </div>

                    {/* PRODUCT INFO */}
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ec1677]">
                          {product.category.name}
                        </p>

                        {!isSoldOut && (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                              isLowStock
                                ? "text-orange-500"
                                : "text-[#8c7881]"
                            }`}
                          >
                            {isLowStock
                              ? `Only ${product.stock} left`
                              : "In stock"}
                          </span>
                        )}
                      </div>

                      <a href={`/products/${product.slug}`}>
                        <h2 className="text-lg font-bold tracking-[-0.02em] transition group-hover:text-[#ec1677] sm:text-xl">
                          {product.name}
                        </h2>
                      </a>

                      {/* RATING */}
                      <div className="mt-3 flex items-center gap-2">
                        {reviewSummary && reviewSummary.reviewCount > 0 ? (
                          <>
                            <div
                              className="flex items-center gap-0.5 text-sm"
                              aria-label={`${reviewSummary.averageRating.toFixed(
                                1
                              )} out of 5 stars`}
                            >
                              {renderStars(reviewSummary.averageRating)}
                            </div>

                            <span className="text-xs font-semibold text-[#8a737d]">
                              {reviewSummary.averageRating.toFixed(1)}
                            </span>

                            <span className="text-xs text-[#b29fa7]">
                              ({reviewSummary.reviewCount})
                            </span>
                          </>
                        ) : (
                          <a
                            href={`/products/${product.slug}`}
                            className="text-xs font-semibold text-[#a18b94] transition hover:text-[#ec1677]"
                          >
                            Be the first to review
                          </a>
                        )}
                      </div>

                      {(product.flavor || product.shade) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {product.flavor && (
                            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs text-[#876d78]">
                              {product.flavor}
                            </span>
                          )}

                          {product.shade && (
                            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs text-[#876d78]">
                              {product.shade}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-3 min-h-[42px] text-sm leading-6 text-[#8a737d]">
                        {product.description ||
                          "A little everyday lip love from Molippy Products."}
                      </p>

                      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-lg font-black">
                          ₦{(product.price / 100).toLocaleString("en-NG")}
                        </p>

                        <a
                          href={`/products/${product.slug}`}
                          className={`flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-bold transition sm:w-auto ${
                            isSoldOut
                              ? "pointer-events-none bg-gray-100 text-gray-400"
                              : "bg-[#24151d] text-white hover:bg-[#ec1677]"
                          }`}
                        >
                          {isSoldOut ? "Unavailable" : "Shop now"}
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* RITUAL CTA */}
      <section className="px-4 pb-12 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[28px] bg-[#ec1677] px-6 py-10 text-white sm:rounded-[36px] sm:px-12 sm:py-16 lg:px-16">
            <div className="absolute right-[-70px] top-[-80px] h-64 w-64 rounded-full border-[45px] border-white/10" />

            <div className="absolute bottom-[-90px] left-[30%] h-64 w-64 rounded-full bg-white/10" />

            <div className="relative grid items-center gap-7 sm:gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-pink-100">
                  The Molippy ritual
                </p>

                <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:mt-4 sm:text-5xl">
                  Your lips deserve a little main-character energy.
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-pink-50 sm:mt-5 sm:text-base sm:leading-7">
                  Pick your essentials, build your lip routine and make
                  softness part of your everyday beauty ritual.
                </p>
              </div>

              <a
                href="/account"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-bold text-[#ec1677] transition hover:bg-[#24151d] hover:text-white sm:w-fit"
              >
                Build my ritual →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND STATEMENT */}
      <section className="border-t border-pink-100 bg-[#fff1f6] px-4 py-14 text-center sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#ec1677]">
            MOLIPPY PRODUCTS
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:mt-5 sm:text-6xl">
            Where beauty
            <br />
            meets confidence.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#816b75] sm:mt-6 sm:text-base sm:leading-7">
            Lip care made with intention for girls who love looking good,
            feeling good and showing up as themselves.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#24151d] px-4 py-8 text-white sm:px-8 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black tracking-[-0.03em]">
              MOLIPPY PRODUCTS
            </p>

            <p className="mt-1 text-xs text-white/50">
              Where beauty meets confidence.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
            <a href="/" className="transition hover:text-white">
              Home
            </a>

            <a href="/account" className="transition hover:text-white">
              Account
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