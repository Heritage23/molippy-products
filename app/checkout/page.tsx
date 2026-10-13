
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
};

type CartItem = {
  id: string;
  quantity: number;
  product: Product;
};

export default function CheckoutPage() {
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [shippingName, setShippingName] = useState("");
  const [shippingEmail, setShippingEmail] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const [creatingOrder, setCreatingOrder] = useState(false);

  const redirectToLogin = useCallback(() => {
    router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
  }, [router]);

  const loadCart = useCallback(async () => {
    try {
      const response = await fetch("/api/cart", {
        cache: "no-store",
      });

      if (response.status === 401) {
        redirectToLogin();
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
      console.error(error);
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    let cancelled = false;

    async function checkAuthentication() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (cancelled) return;

        if (!response.ok) {
          redirectToLogin();
          return;
        }

        const data = await response.json();

        if (cancelled) return;

        if (!data.user) {
          redirectToLogin();
          return;
        }

        // Load private cart data only after authentication succeeds.
        await loadCart();
      } catch (error) {
        if (cancelled) return;

        console.error(error);
        setMessage("Unable to verify your login. Please try again.");
        setLoading(false);
      }
    }

    checkAuthentication();

    return () => {
      cancelled = true;
    };
  }, [loadCart, redirectToLogin]);

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalItems = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  function formatPrice(amount: number) {
    return `₦${(amount / 100).toLocaleString("en-NG")}`;
  }

  async function createOrder() {
    setMessage("");

    if (!shippingName.trim()) {
      setMessage("Please enter your full name.");
      return;
    }

    if (!shippingEmail.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (!shippingPhone.trim()) {
      setMessage("Please enter your phone number.");
      return;
    }

    if (!shippingAddress.trim()) {
      setMessage("Please enter your delivery address.");
      return;
    }

    try {
      setCreatingOrder(true);

      // Verify the session again before attempting to create an order.
      const authResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!authResponse.ok) {
        redirectToLogin();
        return;
      }

      const authData = await authResponse.json();

      if (!authData.user) {
        redirectToLogin();
        return;
      }

      // Step 1: Create the order.
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shippingName,
          shippingEmail,
          shippingPhone,
          shippingAddress,
        }),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to create order.");
        return;
      }

      if (!data.order?.id) {
        setMessage("We couldn't confirm your order. Please try again.");
        return;
      }

      // Step 2: Initialize Paystack payment.
      const paymentResponse = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: data.order.id,
        }),
      });

      if (paymentResponse.status === 401) {
        redirectToLogin();
        return;
      }

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        setMessage(
          paymentData.message || "Unable to initialize payment."
        );
        return;
      }

      if (!paymentData.authorizationUrl) {
        setMessage("We couldn't open the payment page. Please try again.");
        return;
      }

      // Step 3: Redirect the customer to Paystack.
      window.location.href = paymentData.authorizationUrl;
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while creating your order.");
    } finally {
      setCreatingOrder(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-5 w-32 rounded-full bg-[#f4dce7]" />

          <div className="mt-7 h-10 w-56 rounded-2xl bg-[#f4dce7] sm:h-12 sm:w-64" />

          <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
            <div className="space-y-4">
              <div className="h-24 rounded-[26px] bg-white" />
              <div className="h-24 rounded-[26px] bg-white" />
              <div className="h-32 rounded-[26px] bg-white" />
            </div>

            <div className="h-72 rounded-[28px] bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (message && items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-4">
        <div className="w-full max-w-lg rounded-[28px] bg-white p-6 text-center shadow-[0_20px_70px_rgba(94,28,56,0.08)] sm:rounded-[32px] sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0f6] text-2xl">
            ♡
          </div>

          <p className="mt-5 text-sm text-[#7d6470]">
            Something went wrong
          </p>

          <h1 className="mt-2 font-serif text-2xl font-semibold text-[#2d1721] sm:text-3xl">
            We couldn&apos;t load your checkout
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#8b707b]">
            {message}
          </p>

          <a
            href="/cart"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#e91e63] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#c91854]"
          >
            Back to bag
          </a>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-4">
        <div className="w-full max-w-lg rounded-[28px] bg-white p-6 text-center shadow-[0_20px_70px_rgba(94,28,56,0.08)] sm:rounded-[32px] sm:p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#ffe5ef] text-3xl">
            ♡
          </div>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.25em] text-[#e91e63]">
            Molippy Products
          </p>

          <h1 className="mt-3 font-serif text-3xl font-semibold text-[#2d1721]">
            Your bag is empty
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#8b707b]">
            Your lip ritual is waiting. Add something beautiful
            before heading to checkout.
          </p>

          <a
            href="/products"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#e91e63] px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-[#c91854]"
          >
            Shop Molippy
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2d1721]">
      {/* HEADER */}
      <header className="border-b border-[#f2dfe7] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
          <a
            href="/"
            className="font-serif text-xl font-bold tracking-[-0.03em] text-[#e91e63] sm:text-2xl"
          >
            MOLIPPY
            <span className="ml-1 text-[#2d1721]">PRODUCTS</span>
          </a>

          <a
            href="/cart"
            className="flex min-h-10 items-center gap-2 text-xs font-semibold text-[#5e4550] transition hover:text-[#e91e63] sm:text-sm"
          >
            <span>←</span>
            Back to bag
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-12">
        {/* PROGRESS */}
        <div className="mb-9 flex items-center justify-center overflow-x-auto">
          <div className="flex min-w-max items-center">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e91e63] text-xs font-bold text-white">
                ✓
              </div>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[#e91e63] sm:block">
                Bag
              </span>
            </div>

            <div className="mx-3 h-px w-8 bg-[#e91e63] sm:mx-5 sm:w-20" />

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e91e63] text-xs font-bold text-white">
                2
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e91e63] sm:text-xs">
                Checkout
              </span>
            </div>

            <div className="mx-3 h-px w-8 bg-[#ead9e1] sm:mx-5 sm:w-20" />

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dfcbd5] bg-white text-xs font-bold text-[#9b8490]">
                3
              </div>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b8490] sm:block">
                Payment
              </span>
            </div>
          </div>
        </div>

        {/* INTRO */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#e91e63]">
            Almost yours ♡
          </p>

          <h1 className="mt-3 font-serif text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl">
            Let&apos;s get your
            <br />
            <span className="italic text-[#e91e63]">Molippy</span>{" "}
            order to you.
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-[#806a75]">
            Enter your delivery details below. You&apos;ll be
            securely redirected to Paystack to complete your payment.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_390px] lg:gap-8">
          {/* LEFT */}
          <section className="space-y-6 sm:space-y-7">
            {/* DELIVERY */}
            <div className="rounded-[26px] border border-[#f0dfe6] bg-white p-5 shadow-[0_15px_50px_rgba(94,28,56,0.05)] sm:rounded-[28px] sm:p-8">
              <div className="mb-6 sm:mb-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffe5ef] text-sm font-bold text-[#e91e63]">
                    01
                  </span>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e91e63]">
                      Delivery
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-semibold sm:text-2xl">
                      Where should we send it?
                    </h2>
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                <div>
                  <label
                    htmlFor="shippingName"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#624b56] sm:text-xs"
                  >
                    Full name
                  </label>
                  <input
                    id="shippingName"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    className="min-h-12 w-full rounded-2xl border border-[#e8d8df] bg-[#fffafd] px-4 py-3.5 text-sm text-[#2d1721] outline-none transition placeholder:text-[#ad9aa3] focus:border-[#e91e63] focus:ring-4 focus:ring-[#e91e63]/10"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="shippingEmail"
                      className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#624b56] sm:text-xs"
                    >
                      Email address
                    </label>
                    <input
                      id="shippingEmail"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={shippingEmail}
                      onChange={(e) => setShippingEmail(e.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-[#e8d8df] bg-[#fffafd] px-4 py-3.5 text-sm text-[#2d1721] outline-none transition placeholder:text-[#ad9aa3] focus:border-[#e91e63] focus:ring-4 focus:ring-[#e91e63]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="shippingPhone"
                      className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#624b56] sm:text-xs"
                    >
                      Phone number
                    </label>
                    <input
                      id="shippingPhone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="080 0000 0000"
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-[#e8d8df] bg-[#fffafd] px-4 py-3.5 text-sm text-[#2d1721] outline-none transition placeholder:text-[#ad9aa3] focus:border-[#e91e63] focus:ring-4 focus:ring-[#e91e63]/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="shippingAddress"
                    className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#624b56] sm:text-xs"
                  >
                    Delivery address
                  </label>
                  <textarea
                    id="shippingAddress"
                    autoComplete="street-address"
                    placeholder="Enter your full delivery address"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    rows={4}
                    className="min-h-28 w-full resize-none rounded-2xl border border-[#e8d8df] bg-[#fffafd] px-4 py-4 text-sm text-[#2d1721] outline-none transition placeholder:text-[#ad9aa3] focus:border-[#e91e63] focus:ring-4 focus:ring-[#e91e63]/10"
                  />
                </div>

                {message && (
                  <div className="rounded-2xl border border-[#f4c8d6] bg-[#fff1f6] px-4 py-3.5 text-sm font-medium leading-5 text-[#c91854]">
                    {message}
                  </div>
                )}
              </div>
            </div>

            {/* ORDER */}
            <div className="rounded-[26px] border border-[#f0dfe6] bg-white p-5 shadow-[0_15px_50px_rgba(94,28,56,0.05)] sm:rounded-[28px] sm:p-8">
              <div className="mb-6 flex items-start justify-between gap-4 sm:mb-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffe5ef] text-sm font-bold text-[#e91e63]">
                    02
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e91e63]">
                      Your order
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-semibold sm:text-2xl">
                      Your lip ritual
                    </h2>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-[#fff1f6] px-3 py-1.5 text-[11px] font-bold text-[#e91e63]">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="divide-y divide-[#f1e2e8]">
                {items.map((item) => {
                  const image = item.product.images?.[0];

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 py-5 first:pt-0 last:pb-0 sm:gap-4"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#fff1f6] sm:h-20 sm:w-20">
                        {image ? (
                          <img
                            src={image}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xl">
                            ♡
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-5 text-[#2d1721]">
                          {item.product.name}
                        </p>
                        <p className="mt-1 text-xs text-[#927b85]">
                          Quantity × {item.quantity}
                        </p>
                        <p className="mt-1.5 text-xs font-semibold text-[#e91e63]">
                          {formatPrice(item.product.price)} each
                        </p>
                      </div>

                      <p className="shrink-0 text-xs font-bold text-[#2d1721] sm:text-sm">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TRUST */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#f0dfe6] bg-white p-4">
                <span className="text-lg">🔒</span>
                <p className="mt-2 text-xs font-bold text-[#3d2932]">
                  Secure payment
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#927b85]">
                  Protected by Paystack
                </p>
              </div>

              <div className="rounded-2xl border border-[#f0dfe6] bg-white p-4">
                <span className="text-lg">💗</span>
                <p className="mt-2 text-xs font-bold text-[#3d2932]">
                  Made with care
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#927b85]">
                  Your order is prepared with love
                </p>
              </div>

              <div className="rounded-2xl border border-[#f0dfe6] bg-white p-4">
                <span className="text-lg">✨</span>
                <p className="mt-2 text-xs font-bold text-[#3d2932]">
                  Molippy quality
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#927b85]">
                  Beauty meets confidence
                </p>
              </div>
            </div>
          </section>

          {/* RIGHT SUMMARY */}
          <aside className="lg:sticky lg:top-6 lg:h-fit">
            <div className="overflow-hidden rounded-[28px] bg-[#351722] text-white shadow-[0_25px_70px_rgba(53,23,34,0.18)] sm:rounded-[30px]">
              <div className="relative overflow-hidden p-6 sm:p-8">
                <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[#e91e63]/30 blur-2xl" />

                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ff9fc1] sm:text-xs">
                    Molippy Products
                  </p>
                  <h2 className="mt-3 font-serif text-2xl font-semibold sm:text-3xl">
                    Your order
                    <br />
                    summary.
                  </h2>
                </div>
              </div>

              <div className="border-t border-white/10 px-6 py-6 sm:px-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-5 text-sm text-white/65">
                    <span>Items</span>
                    <span>{totalItems}</span>
                  </div>

                  <div className="flex items-center justify-between gap-5 text-sm text-white/65">
                    <span>Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>

                  <div className="flex items-start justify-between gap-5 text-sm text-white/65">
                    <span>Delivery</span>
                    <span className="max-w-[150px] text-right text-xs leading-5 text-[#ff9fc1]">
                      Calculated separately
                    </span>
                  </div>
                </div>

                <div className="my-6 h-px bg-white/10" />

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">
                      Total
                    </p>
                    <p className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
                      {formatPrice(total)}
                    </p>
                  </div>
                  <span className="pb-1 text-[10px] text-white/45">
                    NGN
                  </span>
                </div>

                {message && (
                  <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm leading-5 text-red-100">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={createOrder}
                  disabled={creatingOrder}
                  className="mt-6 flex min-h-14 w-full touch-manipulation items-center justify-center gap-3 rounded-full bg-[#e91e63] px-5 py-4 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-[#f42b70] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingOrder ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Preparing payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to secure payment</span>
                      <span>→</span>
                    </>
                  )}
                </button>

                <div className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] leading-4 text-white/45 sm:text-[11px]">
                  <span>🔒</span>
                  <span>Secure checkout powered by Paystack</span>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-[#927b85]">
              By continuing, you&apos;ll be redirected to Paystack
              to securely complete your payment.
            </p>
          </aside>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-[#f0dfe6] bg-white px-5 py-8 sm:mt-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="font-serif text-lg font-semibold text-[#e91e63]">
            MOLIPPY PRODUCTS
          </p>
          <p className="text-xs text-[#9b8490]">
            Where beauty meets confidence. ♡
          </p>
        </div>
      </footer>
    </main>
  );
}
