"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
};

type WishlistItem = {
  id: string;
  product: Product;
};

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: Product;
};

type Order = {
  id: string;
  total: number;
  status: string;
  paymentReference: string | null;
  shippingName: string | null;
  shippingEmail: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

function formatPrice(priceInKobo: number) {
  return `₦${(priceInKobo / 100).toLocaleString("en-NG")}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "DELIVERED":
      return "bg-[#e8f8ef] text-[#278653]";
    case "SHIPPED":
      return "bg-[#edf4ff] text-[#3974c7]";
    case "PROCESSING":
      return "bg-[#fff4df] text-[#b87312]";
    case "PAID":
      return "bg-[#ffe9f2] text-[#e91e63]";
    case "CANCELLED":
      return "bg-[#f6e9ec] text-[#a34d63]";
    default:
      return "bg-[#f7edf1] text-[#806773]";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "DELIVERED":
      return "Delivered";
    case "SHIPPED":
      return "Shipped";
    case "PROCESSING":
      return "Processing";
    case "PAID":
      return "Paid";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Pending";
  }
}

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [ordersMessage, setOrdersMessage] = useState("");
  const [wishlistMessage, setWishlistMessage] = useState("");

  const [removingWishlistId, setRemovingWishlistId] = useState<string | null>(
    null
  );

  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let redirecting = false;
    let cancelled = false;

    async function loadAccount() {
      try {
        const userResponse = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        const userData = await userResponse.json();

        if (cancelled) return;

        if (!userResponse.ok || !userData.user) {
          redirecting = true;
          router.replace(
            `/login?next=${encodeURIComponent("/account")}`
          );
          return;
        }

        setUser(userData.user);

        // Load private account information only after authentication succeeds.
        const [ordersResponse, wishlistResponse] = await Promise.all([
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/wishlist", { cache: "no-store" }),
        ]);

        if (ordersResponse.status === 401 || wishlistResponse.status === 401) {
          router.replace(`/login?next=${encodeURIComponent("/account")}`);
          return;
        }

        const [ordersData, wishlistData] = await Promise.all([
          ordersResponse.json(),
          wishlistResponse.json(),
        ]);
        if (cancelled) return;

        if (!ordersResponse.ok) {
          setOrdersMessage(
            ordersData.message || "Unable to load your orders."
          );
        } else {
          setOrders(ordersData.orders || []);
        }

        if (!wishlistResponse.ok) {
          setWishlistMessage(
            wishlistData.message || "Unable to load your wishlist."
          );
        } else {
          setWishlist(wishlistData.wishlist?.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setMessage("Unable to load your account.");
        }
      } finally {
        if (!cancelled && !redirecting) {
          setLoading(false);
          setOrdersLoading(false);
          setWishlistLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function removeFromWishlist(productId: string) {
    try {
      setRemovingWishlistId(productId);
      setWishlistMessage("");

      const response = await fetch("/api/wishlist", {
        method: "DELETE",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });
      const data = await response.json();

      if (response.status === 401) {
        router.replace(
          `/login?next=${encodeURIComponent("/account")}`
        );
        return;
      }

      if (!response.ok) {
        setWishlistMessage(
          data.message || "Unable to remove this product from your wishlist."
        );
        return;
      }

      setWishlist((currentWishlist) =>
        currentWishlist.filter((item) => item.product.id !== productId)
      );
    } catch (error) {
      console.error(error);
      setWishlistMessage(
        "Something went wrong. Please try removing the product again."
      );
    } finally {
      setRemovingWishlistId(null);
    }
  }

  async function logout() {
    try {
      setLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setLoggingOut(false);
        setMessage("Unable to log out. Please try again.");
        return;
      }

      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      setLoggingOut(false);
      setMessage("Unable to log out. Please try again.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-4 py-8 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-7 w-36 rounded-full bg-[#f4dce7]" />
            <div className="h-8 w-20 rounded-full bg-[#f8e8ee]" />
          </div>

          <div className="mt-8 h-64 rounded-[28px] bg-[#351722] sm:mt-12 sm:h-72" />

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="h-72 rounded-[28px] bg-white" />
            <div className="h-72 rounded-[28px] bg-white" />
          </div>

          <div className="mt-6 h-64 rounded-[28px] bg-white" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-4 py-8 sm:px-5">
        <div className="w-full max-w-lg rounded-[28px] border border-[#f0dfe6] bg-white p-7 text-center shadow-[0_20px_70px_rgba(94,28,56,0.08)] sm:rounded-[32px] sm:p-12">
          <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full bg-[#ffe5ef] text-3xl text-[#e91e63] sm:h-20 sm:w-20">
            ♡
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.25em] text-[#e91e63] sm:text-xs sm:tracking-[0.28em]">
            Molippy Products
          </p>

          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] text-[#2d1721] sm:text-4xl">
            Your account is waiting.
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[#8b707b]">
            Sign in to manage your Molippy account and keep your lip ritual in
            one place.
          </p>

          {message && (
            <p className="mt-5 rounded-2xl bg-[#fff1f6] p-3 text-sm leading-5 text-[#9b5b73]">
              {message}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/login?next=%2Faccount"
              className="flex min-h-12 items-center justify-center rounded-full bg-[#e91e63] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c91854]"
            >
              Login
            </a>

            <a
              href="/signup"
              className="flex min-h-12 items-center justify-center rounded-full border border-[#ead8e1] bg-white px-7 py-3.5 text-sm font-bold text-[#4f3842] transition hover:border-[#e91e63] hover:text-[#e91e63]"
            >
              Create account
            </a>
          </div>

          <a
            href="/products"
            className="mt-7 inline-flex min-h-10 items-center text-xs font-semibold text-[#e91e63] hover:underline"
          >
            Continue shopping →
          </a>
        </div>
      </main>
    );
  }

  const displayName = user.name || "Molippy Girl";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fff8fb] text-[#2d1721]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#f2dfe7] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
          <a
            href="/"
            className="shrink-0 font-serif text-xl font-bold tracking-[-0.04em] text-[#e91e63] sm:text-2xl"
          >
            MOLIPPY
            <span className="ml-1 hidden text-[#2d1721] min-[380px]:inline">
              PRODUCTS
            </span>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="/products"
              className="hidden min-h-10 items-center rounded-full px-4 text-xs font-bold text-[#6b4d5a] transition hover:bg-[#fff0f5] hover:text-[#e91e63] sm:inline-flex"
            >
              Shop
            </a>

            <a
              href="/cart"
              className="inline-flex min-h-10 items-center rounded-full border border-[#ead8e1] bg-white px-4 text-xs font-bold text-[#5e4550] transition hover:border-[#e91e63] hover:text-[#e91e63] sm:px-5"
            >
              View bag →
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-14">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] bg-[#351722] px-5 py-8 text-white sm:rounded-[32px] sm:px-10 sm:py-12">
          <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#e91e63]/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#ff9fc1]/10 blur-3xl" />

          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ff9fc1] sm:text-xs sm:tracking-[0.28em]">
              Your Molippy space
            </p>

            <h1 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-[-0.04em] sm:mt-4 sm:text-5xl">
              Hey, <span className="italic text-[#ff9fc1]">{displayName}</span>.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:mt-4 sm:text-base sm:leading-7">
              Welcome back to your little corner of beauty, confidence and soft
              lips.
            </p>
          </div>
        </section>

        {/* Main grid */}
        <section className="mt-5 grid gap-5 lg:mt-8 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Profile */}
          <div className="rounded-[26px] border border-[#f0dfe6] bg-white p-5 shadow-[0_15px_50px_rgba(94,28,56,0.05)] sm:rounded-[30px] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e91e63] sm:text-xs sm:tracking-[0.22em]">
                  Profile
                </p>

                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  Your details
                </h2>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffe5ef] font-serif text-xl text-[#e91e63] sm:h-12 sm:w-12">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="mt-6 divide-y divide-[#f1e2e8] sm:mt-7">
              <div className="py-4 first:pt-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b8490]">
                  Name
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-[#3d2932]">
                  {user.name || "Not provided"}
                </p>
              </div>

              <div className="py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b8490]">
                  Email
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-[#3d2932]">
                  {user.email}
                </p>
              </div>

              <div className="py-4 last:pb-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b8490]">
                  Account type
                </p>
                <div className="mt-2">
                  <span className="inline-flex rounded-full bg-[#fff0f6] px-3 py-1.5 text-xs font-bold capitalize text-[#e91e63]">
                    {user.role.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-[26px] border border-[#f0dfe6] bg-white p-5 shadow-[0_15px_50px_rgba(94,28,56,0.05)] sm:rounded-[30px] sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e91e63] sm:text-xs sm:tracking-[0.22em]">
              Explore
            </p>

            <h2 className="mt-2 font-serif text-2xl font-semibold">
              Your Molippy
            </h2>

            <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
              <a
                href="/products"
                className="group flex min-h-[74px] items-center justify-between rounded-2xl bg-[#fff5f8] p-4 transition hover:bg-[#ffe9f1]"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold text-[#3d2932]">
                    Shop products
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#927b85]">
                    Find your next lip essential
                  </p>
                </div>
                <span className="shrink-0 text-lg text-[#e91e63] transition group-hover:translate-x-1">
                  →
                </span>
              </a>

              <a
                href="/cart"
                className="group flex min-h-[74px] items-center justify-between rounded-2xl bg-[#fff5f8] p-4 transition hover:bg-[#ffe9f1]"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold text-[#3d2932]">My bag</p>
                  <p className="mt-1 text-xs leading-5 text-[#927b85]">
                    Review your selected products
                  </p>
                </div>
                <span className="shrink-0 text-lg text-[#e91e63] transition group-hover:translate-x-1">
                  →
                </span>
              </a>

              <a
                href="#wishlist"
                className="group flex min-h-[74px] items-center justify-between rounded-2xl bg-[#fff5f8] p-4 transition hover:bg-[#ffe9f1]"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold text-[#3d2932]">
                    My wishlist
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#927b85]">
                    {wishlist.length > 0
                      ? `${wishlist.length} saved product${wishlist.length === 1 ? "" : "s"
                      }`
                      : "Products you love"}
                  </p>
                </div>
                <span className="shrink-0 text-lg text-[#e91e63] transition group-hover:translate-x-1">
                  ♡
                </span>
              </a>

              <a
                href="#orders"
                className="group flex min-h-[74px] items-center justify-between rounded-2xl bg-[#fff5f8] p-4 transition hover:bg-[#ffe9f1]"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-bold text-[#3d2932]">
                    Order history
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#927b85]">
                    {orders.length > 0
                      ? `${orders.length} order${orders.length === 1 ? "" : "s"
                      } placed`
                      : "Your orders will appear here"}
                  </p>
                </div>
                <span className="shrink-0 text-lg text-[#e91e63] transition group-hover:translate-x-1">
                  →
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* Wishlist */}
        <section id="wishlist" className="mt-10 scroll-mt-24 sm:mt-12">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e91e63] sm:text-xs sm:tracking-[0.24em]">
                Saved with love
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                My wishlist
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#8b707b]">
                Your favourite Molippy essentials, saved for later.
              </p>
            </div>

            {wishlist.length > 0 && (
              <span className="text-xs font-semibold text-[#9b8490]">
                {wishlist.length} saved item{wishlist.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="mt-5 sm:mt-6">
            {wishlistLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse overflow-hidden rounded-[26px] border border-[#f0dfe6] bg-white"
                  >
                    <div className="h-52 bg-[#f8e8ee] sm:h-56" />
                    <div className="p-5">
                      <div className="h-5 w-36 rounded bg-[#f4dce7]" />
                      <div className="mt-3 h-4 w-24 rounded bg-[#f8e8ee]" />
                      <div className="mt-5 h-11 w-full rounded-full bg-[#f8e8ee]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : wishlistMessage ? (
              <div className="rounded-[26px] border border-[#f0dfe6] bg-white p-7 text-center sm:rounded-[28px] sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f6] text-2xl text-[#e91e63]">
                  !
                </div>
                <h3 className="mt-5 font-serif text-2xl font-semibold">
                  Your wishlist needs a little refresh.
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#8b707b]">
                  {wishlistMessage}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-6 min-h-11 rounded-full bg-[#e91e63] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c91854]"
                >
                  Try again
                </button>
              </div>
            ) : wishlist.length === 0 ? (
              <div className="relative overflow-hidden rounded-[28px] border border-[#f0dfe6] bg-white p-7 text-center sm:rounded-[30px] sm:p-12">
                <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#ffe5ef]" />
                <div className="absolute -bottom-20 -right-10 h-44 w-44 rounded-full bg-[#fff0f5]" />

                <div className="relative">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe5ef] text-2xl text-[#e91e63]">
                    ♡
                  </div>
                  <h3 className="mt-5 font-serif text-2xl font-semibold">
                    Nothing saved yet.
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8b707b]">
                    Found something you love? Tap the heart on any Molippy
                    product and it will live here.
                  </p>
                  <a
                    href="/products"
                    className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#e91e63] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c91854]"
                  >
                    Discover products
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wishlist.map((item) => {
                  const product = item.product;
                  const isRemoving = removingWishlistId === product.id;

                  return (
                    <article
                      key={item.id}
                      className="group overflow-hidden rounded-[26px] border border-[#f0dfe6] bg-white shadow-[0_12px_40px_rgba(94,28,56,0.04)] transition hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(94,28,56,0.08)] sm:rounded-[28px]"
                    >
                      <div className="relative h-56 overflow-hidden bg-[#fff0f5] sm:h-60">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="font-serif text-4xl text-[#e91e63]">
                              ♡
                            </span>
                          </div>
                        )}

                        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#e91e63] backdrop-blur sm:left-4 sm:top-4">
                          Saved
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromWishlist(product.id)}
                          disabled={isRemoving}
                          aria-label={`Remove ${product.name} from wishlist`}
                          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-lg text-[#e91e63] shadow-sm transition hover:bg-[#e91e63] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:right-4 sm:top-4"
                        >
                          {isRemoving ? "…" : "♥"}
                        </button>
                      </div>

                      <div className="p-5">
                        <h3 className="line-clamp-2 font-serif text-xl font-semibold leading-tight text-[#3d2932]">
                          {product.name}
                        </h3>
                        <p className="mt-2 text-sm font-bold text-[#e91e63]">
                          {formatPrice(product.price)}
                        </p>

                        {product.stock > 0 ? (
                          <p className="mt-2 text-xs font-medium text-[#6f8276]">
                            In stock
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-medium text-[#b34d67]">
                            Currently out of stock
                          </p>
                        )}

                        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                          <a
                            href={`/products/${product.slug}`}
                            className="flex min-h-11 items-center justify-center rounded-full bg-[#e91e63] px-4 py-3 text-center text-xs font-bold text-white transition hover:bg-[#c91854]"
                          >
                            View product
                          </a>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(product.id)}
                            disabled={isRemoving}
                            className="min-h-11 rounded-full border border-[#ead8e1] px-4 py-3 text-xs font-bold text-[#6b4d5a] transition hover:border-[#e91e63] hover:text-[#e91e63] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isRemoving ? "..." : "Remove"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Orders */}
        <section id="orders" className="mt-10 scroll-mt-24 sm:mt-12">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e91e63] sm:text-xs sm:tracking-[0.24em]">
                Your purchases
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Order history
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#8b707b]">
                Everything you&apos;ve ordered from Molippy, in one place.
              </p>
            </div>

            {orders.length > 0 && (
              <span className="text-xs font-semibold text-[#9b8490]">
                {orders.length} total order{orders.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="mt-5 sm:mt-6">
            {ordersLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-[26px] border border-[#f0dfe6] bg-white p-5 sm:rounded-[28px] sm:p-6"
                  >
                    <div className="h-4 w-32 rounded bg-[#f4dce7]" />
                    <div className="mt-5 h-5 w-60 max-w-full rounded bg-[#f8e8ee]" />
                    <div className="mt-4 h-4 w-40 rounded bg-[#f8e8ee]" />
                    <div className="mt-7 h-12 w-full rounded-2xl bg-[#f8e8ee]" />
                  </div>
                ))}
              </div>
            ) : ordersMessage ? (
              <div className="rounded-[26px] border border-[#f0dfe6] bg-white p-7 text-center sm:rounded-[28px] sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f6] text-2xl text-[#e91e63]">
                  !
                </div>
                <h3 className="mt-5 font-serif text-2xl font-semibold">
                  We couldn&apos;t load your orders.
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#8b707b]">
                  {ordersMessage}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-6 min-h-11 rounded-full bg-[#e91e63] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#c91854]"
                >
                  Try again
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="relative overflow-hidden rounded-[28px] border border-[#f0dfe6] bg-white p-7 text-center sm:rounded-[30px] sm:p-12">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#ffe5ef]" />

                <div className="relative">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ffe5ef] text-2xl text-[#e91e63]">
                    ♡
                  </div>
                  <h3 className="mt-5 font-serif text-2xl font-semibold">
                    Your order story starts here.
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8b707b]">
                    You haven&apos;t placed an order yet. Find something
                    beautiful and start your Molippy ritual.
                  </p>
                  <a
                    href="/products"
                    className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#e91e63] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c91854]"
                  >
                    Shop Molippy
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {orders.map((order, index) => {
                  const totalItems = order.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );

                  const firstProduct = order.items[0]?.product;
                  const additionalItems = order.items.length - 1;

                  return (
                    <article
                      key={order.id}
                      className="group rounded-[26px] border border-[#f0dfe6] bg-white p-4 shadow-[0_12px_40px_rgba(94,28,56,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(94,28,56,0.08)] sm:rounded-[28px] sm:p-6"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff0f5] sm:h-16 sm:w-16">
                            {firstProduct?.images?.[0] ? (
                              <img
                                src={firstProduct.images[0]}
                                alt={firstProduct.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-serif text-2xl text-[#e91e63]">
                                ♡
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9b8490] sm:text-[11px] sm:tracking-[0.16em]">
                                Order #{orders.length - index}
                              </p>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] sm:px-3 sm:text-[10px] sm:tracking-[0.12em] ${getStatusStyle(
                                  order.status
                                )}`}
                              >
                                {getStatusLabel(order.status)}
                              </span>
                            </div>

                            <h3 className="mt-1 truncate font-serif text-lg font-semibold text-[#3d2932] sm:mt-2 sm:text-xl">
                              {firstProduct?.name || "Molippy Product"}
                            </h3>

                            <p className="mt-1 text-[11px] leading-5 text-[#927b85] sm:text-xs">
                              {totalItems} item{totalItems === 1 ? "" : "s"}
                              {additionalItems > 0
                                ? ` · +${additionalItems} more product${additionalItems === 1 ? "" : "s"
                                }`
                                : ""}
                              {" · "}
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-[#f1e2e8] pt-4 sm:min-w-[230px] sm:border-t-0 sm:pt-0">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9b8490] sm:text-[10px] sm:tracking-[0.15em]">
                              Total
                            </p>
                            <p className="mt-1 text-base font-bold text-[#3d2932] sm:text-lg">
                              {formatPrice(order.total)}
                            </p>
                          </div>

                          <a
                            href={`/account/orders/${order.id}`}
                            className="inline-flex min-h-11 items-center rounded-full border border-[#ead8e1] px-4 py-2.5 text-xs font-bold text-[#5f4651] transition hover:border-[#e91e63] hover:text-[#e91e63]"
                          >
                            View order →
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

        {/* Brand message */}
        <section className="mt-10 rounded-[28px] border border-[#f0dfe6] bg-[#ffe8f0] p-6 sm:mt-12 sm:rounded-[30px] sm:p-10">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e91e63] sm:text-xs sm:tracking-[0.24em]">
              The Molippy girl
            </p>

            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
              Beauty is better when
              <br />
              <span className="italic text-[#e91e63]">
                confidence comes with it.
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-[#795965]">
              From your everyday gloss to your full lip ritual, Molippy
              Products is here to make taking care of yourself feel just as
              good as looking good.
            </p>
          </div>
        </section>

        {/* Logout */}
        <section className="mt-8 flex flex-col items-stretch justify-between gap-4 border-t border-[#ead9e1] pt-7 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-[#4a3540]">
              Ready to step away?
            </p>
            <p className="mt-1 text-xs leading-5 text-[#927b85]">
              You can always come back to your Molippy space.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e5cfd9] bg-white px-6 py-3 text-sm font-bold text-[#6b4d5a] transition hover:border-[#e91e63] hover:text-[#e91e63] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#f0dfe6] bg-white px-4 py-8 sm:px-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="font-serif text-lg font-semibold text-[#e91e63]">
            MOLIPPY PRODUCTS
          </p>
          <p className="text-xs text-[#9b8494]">
            Where beauty meets confidence. ♡
          </p>
        </div>
      </footer>
    </main>
  );
}