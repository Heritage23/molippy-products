
"use client";

import { useCallback, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  slug?: string;
  price: number;
  stock: number;
  images: string[];
};

type CartItem = {
  id: string;
  quantity: number;
  product: Product;
};

type GuestCartEntry = {
  productId: string;
  quantity: number;
  product?: Product;
};

const GUEST_CART_KEY = "molippy_guest_cart";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const readGuestCart = useCallback((): GuestCartEntry[] => {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (!stored) return [];

      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is GuestCartEntry =>
          item !== null &&
          typeof item === "object" &&
          typeof item.productId === "string" &&
          typeof item.quantity === "number" &&
          item.quantity > 0
      );
    } catch (error) {
      console.error("Unable to read guest cart:", error);
      return [];
    }
  }, []);

  const saveGuestCart = useCallback((entries: GuestCartEntry[]) => {
    try {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error("Unable to save guest cart:", error);
      setMessage("Unable to save your bag. Please check your browser settings.");
    }
  }, []);

  const loadGuestCart = useCallback(async () => {
    const guestEntries = readGuestCart();

    if (guestEntries.length === 0) {
      setItems([]);
      setMessage("");
      return;
    }

    try {
      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to retrieve products.");
      }

      const data = await response.json();

      const products: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data.products)
          ? data.products
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.data)
              ? data.data
              : [];

      const cartItems: CartItem[] = guestEntries
        .map((entry) => {
          const product =
            products.find((item) => item.id === entry.productId) ??
            entry.product;

          if (!product) return null;

          return {
            id: `guest-${entry.productId}`,
            quantity: Math.min(
              entry.quantity,
              Math.max(1, Number(product.stock ?? entry.quantity))
            ),
            product: {
              ...product,
              stock: Number(product.stock ?? entry.quantity),
              images: Array.isArray(product.images) ? product.images : [],
            },
          };
        })
        .filter((item): item is CartItem => item !== null);

      setItems(cartItems);

      if (cartItems.length < guestEntries.length) {
        setMessage(
          "Some products in your bag are no longer available. Please review your items."
        );
      } else {
        setMessage("");
      }
    } catch (error) {
      console.error("Unable to load guest cart:", error);
      setMessage("Unable to load your bag. Please try again.");
    }
  }, [readGuestCart]);

  const loadAuthenticatedCart = useCallback(async () => {
    try {
      const response = await fetch("/api/cart", {
        cache: "no-store",
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        await loadGuestCart();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to load your cart.");
        return;
      }

      setItems(data.items || []);
      setMessage("");
    } catch (error) {
      console.error("Unable to load authenticated cart:", error);
      setMessage("Something went wrong while loading your bag.");
    }
  }, [loadGuestCart]);

  const loadCart = useCallback(async () => {
    if (isAuthenticated) {
      await loadAuthenticatedCart();
    } else {
      await loadGuestCart();
    }
  }, [isAuthenticated, loadAuthenticatedCart, loadGuestCart]);

  useEffect(() => {
    let cancelled = false;

    async function initializeCart() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();

          if (cancelled) return;

          if (data.user) {
            setIsAuthenticated(true);

            const cartResponse = await fetch("/api/cart", {
              cache: "no-store",
            });

            if (cancelled) return;

            if (cartResponse.status === 401) {
              setIsAuthenticated(false);
              await loadGuestCart();
            } else {
              const cartData = await cartResponse.json();

              if (cancelled) return;

              if (!cartResponse.ok) {
                setMessage(
                  cartData.message || "Unable to load your cart."
                );
              } else {
                setItems(cartData.items || []);
                setMessage("");
              }
            }

            return;
          }
        }

        if (!cancelled) {
          setIsAuthenticated(false);
          await loadGuestCart();
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Unable to initialize cart:", error);
        setMessage("Unable to load your bag. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initializeCart();

    return () => {
      cancelled = true;
    };
  }, [loadGuestCart]);

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;

    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    if (quantity > item.product.stock) {
      setMessage(`Only ${item.product.stock} item(s) are currently available.`);
      return;
    }

    try {
      setUpdatingItem(itemId);
      setMessage("");

      if (!isAuthenticated) {
        const entries = readGuestCart();
        const productId = item.product.id;

        const updatedEntries = entries.map((entry) =>
          entry.productId === productId
            ? { ...entry, quantity, product: item.product }
            : entry
        );

        saveGuestCart(updatedEntries);

        setItems((current) =>
          current.map((entry) =>
            entry.id === itemId ? { ...entry, quantity } : entry
          )
        );

        return;
      }

      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId, quantity }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setMessage("Your session has expired. Please log in to update your saved bag.");
        return;
      }

      if (!response.ok) {
        setMessage(data.message || "Unable to update quantity.");
        return;
      }

      await loadAuthenticatedCart();
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while updating your bag.");
    } finally {
      setUpdatingItem(null);
    }
  }

  async function removeItem(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    try {
      setRemovingItem(itemId);
      setMessage("");

      if (!isAuthenticated) {
        const updatedEntries = readGuestCart().filter(
          (entry) => entry.productId !== item.product.id
        );

        saveGuestCart(updatedEntries);
        setItems((current) => current.filter((entry) => entry.id !== itemId));
        return;
      }

      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setMessage("Your session has expired. Please log in to update your saved bag.");
        return;
      }

      if (!response.ok) {
        setMessage(data.message || "Unable to remove item.");
        return;
      }

      await loadAuthenticatedCart();
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while removing the item.");
    } finally {
      setRemovingItem(null);
    }
  }

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalItems = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const formatPrice = (amount: number) =>
    `₦${(amount / 100).toLocaleString("en-NG")}`;

  const checkoutHref = isAuthenticated
    ? "/checkout"
    : "/login?next=%2Fcheckout";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="h-4 w-24 animate-pulse rounded-full bg-pink-100" />
          <div className="mt-6 h-10 w-56 animate-pulse rounded-2xl bg-pink-100 sm:h-12 sm:w-64" />

          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_370px] lg:gap-8">
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-[26px] bg-white sm:h-40"
                />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-[28px] bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (message && items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-5">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-3xl">
            ♡
          </div>

          <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.25em] text-[#ec1677]">
            MOLIPPY PRODUCTS
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#24151d] sm:text-4xl">
            Your bag needs you.
          </h1>

          <p className="mt-4 text-sm leading-6 text-[#806b75]">
            {message}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#ec1677] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#d70f67]"
          >
            Try again
          </button>

          <a
            href="/products"
            className="mt-4 block text-sm font-bold text-[#ec1677]"
          >
            Continue shopping →
          </a>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center text-center">
          <div>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-3xl sm:h-24 sm:w-24 sm:text-4xl">
              ♡
            </div>

            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.3em] text-[#ec1677] sm:mt-8">
              MOLIPPY PRODUCTS
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              Your bag is empty.
            </h1>

            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#806b75] sm:text-base">
              Your next lip obsession is waiting. Find something cute,
              nourishing and very Molippy.
            </p>

            <a
              href="/products"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#ec1677] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-[#d70f67]"
            >
              Shop Molippy →
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8fb] text-[#24151d]">
      <section className="border-b border-pink-100 bg-white/80 px-4 py-7 backdrop-blur sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ec1677]">
                Your Molippy bag
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                Almost yours.
              </h1>
            </div>

            <a
              href="/products"
              className="w-fit text-sm font-bold text-[#6f5963] transition hover:text-[#ec1677]"
            >
              ← Continue shopping
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-7 sm:px-8 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_370px] lg:items-start lg:gap-8">
          <div>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-[#806b75]">
                {totalItems} {totalItems === 1 ? "item" : "items"} in your bag
              </p>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-[#ec1677] sm:block">
                Molippy girl essentials
              </span>
            </div>

            {message && (
              <div className="mb-5 rounded-2xl bg-pink-50 px-4 py-4 text-sm font-semibold leading-5 text-[#ec1677] sm:px-5">
                {message}
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, index) => {
                const itemTotal = item.product.price * item.quantity;
                const isUpdating = updatingItem === item.id;
                const isRemoving = removingItem === item.id;
                const isBusy = isUpdating || isRemoving;
                const productHref = `/products/${item.product.slug || item.product.id}`;

                return (
                  <article
                    key={item.id}
                    className="group relative overflow-hidden rounded-[24px] bg-white p-3.5 transition hover:shadow-[0_20px_60px_rgba(236,22,119,0.08)] sm:rounded-[28px] sm:p-5"
                  >
                    <div className="flex gap-3.5 sm:gap-6">
                      <a
                        href={productHref}
                        className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[20px] bg-[#f8e9ef] sm:h-36 sm:w-36 sm:rounded-[22px]"
                      >
                        <div className="absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[8px] font-bold backdrop-blur sm:left-3 sm:top-3 sm:h-7 sm:w-7 sm:text-[9px]">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        {item.product.images?.length > 0 ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl">
                            ♡
                          </div>
                        )}
                      </a>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#ec1677] sm:text-[9px]">
                              Molippy Products
                            </p>
                            <a href={productHref} className="mt-1 block">
                              <h2 className="line-clamp-2 text-base font-bold leading-tight tracking-[-0.02em] transition hover:text-[#ec1677] sm:text-xl">
                                {item.product.name}
                              </h2>
                            </a>
                          </div>

                          <p className="hidden whitespace-nowrap text-base font-black sm:block">
                            {formatPrice(itemTotal)}
                          </p>
                        </div>

                        <p className="mt-1.5 text-xs text-[#806b75] sm:mt-2 sm:text-sm">
                          {formatPrice(item.product.price)} each
                        </p>

                        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 sm:mt-5 sm:gap-3">
                          <div
                            className={`flex h-10 items-center rounded-full bg-[#fff1f6] transition ${
                              isUpdating ? "opacity-50" : ""
                            }`}
                          >
                            <button
                              type="button"
                              disabled={item.quantity <= 1 || isBusy}
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-lg transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>

                            <span className="w-8 text-center text-sm font-bold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              disabled={item.quantity >= item.product.stock || isBusy}
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-lg transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={isBusy}
                            className="min-h-10 px-1 text-xs font-semibold text-[#947d87] underline underline-offset-4 transition hover:text-[#ec1677] disabled:opacity-50"
                          >
                            {isRemoving ? "Removing..." : "Remove"}
                          </button>
                        </div>

                        <p className="mt-3 text-base font-black sm:hidden">
                          {formatPrice(itemTotal)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-4 text-center sm:py-5">
                <span className="text-lg">♡</span>
                <p className="mt-2 text-xs font-bold text-[#65525b]">
                  Lip care made with love
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4 text-center sm:py-5">
                <span className="text-lg">✦</span>
                <p className="mt-2 text-xs font-bold text-[#65525b]">
                  Beauty meets confidence
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4 text-center sm:py-5">
                <span className="text-lg">⌁</span>
                <p className="mt-2 text-xs font-bold text-[#65525b]">
                  Shop the Molippy way
                </p>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-[28px] bg-[#24151d] text-white sm:rounded-[30px]">
              <div className="relative p-6 sm:p-8">
                <div className="absolute right-[-50px] top-[-50px] h-36 w-36 rounded-full border-[22px] border-white/5" />

                <div className="relative">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-pink-300">
                    Your order
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                    Let&apos;s make it official.
                  </h2>

                  <div className="my-6 h-px bg-white/10 sm:my-7" />

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between gap-5 text-white/60">
                      <span>Subtotal</span>
                      <span className="font-semibold text-white">
                        {formatPrice(total)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-5 text-white/60">
                      <span>Delivery</span>
                      <span className="text-right text-xs text-white/50">
                        Calculated at checkout
                      </span>
                    </div>
                  </div>

                  <div className="my-6 h-px bg-white/10 sm:my-7" />

                  <div className="flex items-end justify-between gap-5">
                    <div>
                      <p className="text-xs text-white/50">Total</p>
                      <p className="mt-1 text-2xl font-black sm:text-3xl">
                        {formatPrice(total)}
                      </p>
                    </div>
                    <span className="text-3xl text-pink-300">♡</span>
                  </div>

                  <a
                    href={checkoutHref}
                    className="mt-6 flex min-h-14 touch-manipulation items-center justify-center rounded-full bg-[#ec1677] px-6 text-sm font-bold text-white transition hover:bg-white hover:text-[#ec1677] active:scale-[0.98] sm:mt-7"
                  >
                    Proceed to Checkout →
                  </a>

                  {!isAuthenticated && (
                    <p className="mt-3 text-center text-[11px] leading-5 text-white/60">
                      You can shop as a guest. Log in or create an account when
                      you&apos;re ready to checkout.
                    </p>
                  )}

                  <p className="mt-3 text-center text-[10px] leading-5 text-white/40 sm:text-[11px]">
                    Secure checkout powered by Paystack.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[#ffe5ef] p-5 sm:rounded-[26px] sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ec1677]">
                Still browsing?
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#5f4b54]">
                Your lip routine can always use one more cute thing.
              </p>
              <a
                href="/products"
                className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-[#ec1677] underline underline-offset-4"
              >
                Explore the collection →
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-pink-100 bg-[#fff1f6] px-5 py-12 text-center sm:px-8 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#ec1677]">
          MOLIPPY PRODUCTS
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-[-0.05em] sm:text-5xl">
          Soft lips are always a good idea.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#806b75]">
          Where beauty meets confidence — one lip ritual at a time.
        </p>
      </section>

      <footer className="bg-[#24151d] px-5 py-9 text-white sm:px-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black tracking-[-0.03em]">
              MOLIPPY PRODUCTS
            </p>
            <p className="mt-1 text-xs text-white/50">
              Where beauty meets confidence.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/60">
            <a href="/" className="transition hover:text-white">
              Home
            </a>
            <a href="/products" className="transition hover:text-white">
              Shop
            </a>
            <a href="/account" className="transition hover:text-white">
              Account
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
