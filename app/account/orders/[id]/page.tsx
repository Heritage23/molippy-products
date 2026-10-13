"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
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
  status:
    | "PENDING"
    | "PAID"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";
  paymentReference: string | null;
  shippingName: string | null;
  shippingEmail: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  createdAt: string;
  items: OrderItem[];
};

function formatPrice(amount: number) {
  return `₦${(amount / 100).toLocaleString("en-NG")}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getPaymentStatus(status: Order["status"]) {
  if (
    status === "PAID" ||
    status === "PROCESSING" ||
    status === "SHIPPED" ||
    status === "DELIVERED"
  ) {
    return "Payment received";
  }

  if (status === "CANCELLED") {
    return "Cancelled";
  }

  return "Payment pending";
}

function getStatusLabel(status: Order["status"]) {
  const labels: Record<Order["status"], string> = {
    PENDING: "Payment pending",
    PAID: "Payment received",
    PROCESSING: "We're preparing your order",
    SHIPPED: "Your order is on the way",
    DELIVERED: "Your order has arrived",
    CANCELLED: "Order cancelled",
  };

  return labels[status];
}

function getStatusStyle(status: Order["status"]) {
  if (status === "DELIVERED") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "SHIPPED") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (status === "PROCESSING") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }

  if (status === "PAID") {
    return "bg-pink-50 text-pink-700 border-pink-200";
  }

  if (status === "CANCELLED") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function getStatusMessage(status: Order["status"]) {
  const messages: Record<Order["status"], string> = {
    PENDING:
      "Your order has been created. Complete your payment to start processing your order.",
    PAID:
      "Your payment has been confirmed. We'll begin preparing your Molippy products soon.",
    PROCESSING:
      "Your order is being carefully prepared. We're getting your Molippy products ready for you.",
    SHIPPED:
      "Your order has left us and is currently on its way to you.",
    DELIVERED:
      "Your Molippy order has arrived. We hope you're loving your new lip essentials.",
    CANCELLED:
      "This order has been cancelled. If you think this happened by mistake, please contact us.",
  };

  return messages[status];
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/orders/${orderId}`);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load order.");
        }

        setOrder(data.order);
      } catch (error) {
        console.error("Order details error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load your order."
        );
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb]">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="h-6 w-32 animate-pulse rounded bg-pink-100" />

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <div className="h-48 animate-pulse rounded-[2rem] bg-white" />
              <div className="h-72 animate-pulse rounded-[2rem] bg-white" />
            </div>

            <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#fff8fb]">
        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-5 text-center">
          <div>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-3xl">
              ♡
            </div>

            <h1 className="mt-6 text-3xl font-black tracking-tight text-zinc-900">
              Order not found
            </h1>

            <p className="mt-3 text-zinc-500">
              {error ||
                "We couldn't find this order in your Molippy account."}
            </p>

            <Link
              href="/account"
              className="mt-7 inline-flex rounded-full bg-zinc-950 px-7 py-3 text-sm font-bold text-white transition hover:bg-pink-600"
            >
              Back to my account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const steps = [
    {
      title: "Order placed",
      description: "We've received your order.",
      icon: "🛍️",
    },
    {
      title: "Payment confirmed",
      description: "Your payment has been received.",
      icon: "💳",
    },
    {
      title: "Processing",
      description: "We're preparing your Molippy products.",
      icon: "💗",
    },
    {
      title: "Shipped",
      description: "Your order is on its way.",
      icon: "🚚",
    },
    {
      title: "Delivered",
      description: "Your Molippy order has arrived.",
      icon: "✨",
    },
  ];

  const statusOrder = [
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
  ];

  const currentStep =
    order.status === "CANCELLED"
      ? -1
      : statusOrder.indexOf(order.status);

  const totalItems = order.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-[#fff8fb] text-zinc-950">
      {/* NAVIGATION */}
      <header className="border-b border-pink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/account"
            className="text-sm font-bold text-zinc-600 transition hover:text-pink-600"
          >
            ← Back to account
          </Link>

          <Link
            href="/"
            className="text-2xl font-black tracking-[-0.06em]"
          >
            MOLIPPY
            <span className="text-pink-600">.</span>
          </Link>

          <Link
            href="/cart"
            className="text-sm font-bold text-zinc-600 transition hover:text-pink-600"
          >
            Bag
          </Link>
        </div>
      </header>

      {/* HEADER */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-pink-600">
              Molippy Products
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Your order
            </h1>

            <p className="mt-3 text-sm text-zinc-500">
              Order placed on {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              Order number
            </p>

            <p className="mt-1 max-w-[280px] break-all text-sm font-bold text-zinc-900">
              #{order.id}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* CURRENT STATUS */}
            <div className="overflow-hidden rounded-[2rem] border border-pink-100 bg-white">
              <div className="bg-gradient-to-br from-pink-600 via-fuchsia-600 to-purple-700 px-6 py-7 text-white sm:px-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-100">
                      What's happening
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                      {getStatusLabel(order.status)}
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                      {getStatusMessage(order.status)}
                    </p>
                  </div>

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl backdrop-blur">
                    {order.status === "PENDING"
                      ? "💳"
                      : order.status === "PAID"
                        ? "💗"
                        : order.status === "PROCESSING"
                          ? "📦"
                          : order.status === "SHIPPED"
                            ? "🚚"
                            : order.status === "DELIVERED"
                              ? "✨"
                              : "♡"}
                  </div>
                </div>

                <div className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide">
                  {order.status}
                </div>
              </div>

              {/* TIMELINE */}
              {order.status !== "CANCELLED" ? (
                <div className="px-6 py-8 sm:px-8">
                  <div className="space-y-7">
                    {steps.map((step, index) => {
                      const completed = index <= currentStep;
                      const active = index === currentStep;

                      return (
                        <div
                          key={step.title}
                          className="flex gap-4"
                        >
                          <div className="relative flex w-9 shrink-0 justify-center">
                            {index < steps.length - 1 && (
                              <div
                                className={`absolute left-1/2 top-9 h-8 w-px -translate-x-1/2 ${
                                  index < currentStep
                                    ? "bg-pink-400"
                                    : "bg-zinc-200"
                                }`}
                              />
                            )}

                            <div
                              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                                completed
                                  ? "bg-pink-600 text-white"
                                  : "border-2 border-zinc-200 bg-white text-zinc-300"
                              }`}
                            >
                              {completed ? "✓" : step.icon}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p
                                className={`text-sm font-black ${
                                  active
                                    ? "text-pink-600"
                                    : completed
                                      ? "text-zinc-900"
                                      : "text-zinc-400"
                                }`}
                              >
                                {step.title}
                              </p>

                              {active && (
                                <span className="w-fit rounded-full bg-pink-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-pink-600">
                                  Current
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-zinc-500">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8">
                  <div className="rounded-2xl bg-red-50 p-5">
                    <p className="font-black text-red-700">
                      This order was cancelled.
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                      If you believe this happened by mistake, please
                      contact Molippy support.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* PRODUCTS */}
            <div className="rounded-[2rem] border border-pink-100 bg-white p-6 sm:p-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                    Your Molippy edit
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {totalItems}{" "}
                    {totalItems === 1 ? "item" : "items"}
                  </h2>
                </div>

                <span className="text-sm font-bold text-pink-600">
                  {formatPrice(order.total)}
                </span>
              </div>

              <div className="mt-7 divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 py-5 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-pink-50">
                      {item.product.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">💋</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-black text-zinc-900">
                        {item.product.name}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Quantity: {item.quantity}
                      </p>

                      <p className="mt-3 text-sm font-bold text-pink-600">
                        {formatPrice(item.price)} each
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-black text-zinc-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DELIVERY */}
            <div className="rounded-[2rem] border border-pink-100 bg-white p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Delivery details
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Where we're sending it
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Name
                  </p>

                  <p className="mt-1 font-bold">
                    {order.shippingName || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Phone
                  </p>

                  <p className="mt-1 font-bold">
                    {order.shippingPhone || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Email
                  </p>

                  <p className="mt-1 break-all font-bold">
                    {order.shippingEmail || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Address
                  </p>

                  <p className="mt-1 font-bold">
                    {order.shippingAddress || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <aside className="space-y-6">
            {/* SUMMARY */}
            <div className="rounded-[2rem] bg-zinc-950 p-6 text-white sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">
                Order summary
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between gap-4 text-sm text-zinc-300">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>

                <div className="h-px bg-white/10" />

                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm text-zinc-300">
                    Total
                  </span>

                  <span className="text-2xl font-black">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* PAYMENT */}
            <div className="rounded-[2rem] border border-pink-100 bg-white p-6 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                Payment
              </p>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-zinc-500">
                    Status
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      getPaymentStatus(order.status) ===
                      "Payment received"
                        ? "bg-emerald-50 text-emerald-700"
                        : getPaymentStatus(order.status) ===
                            "Cancelled"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {getPaymentStatus(order.status)}
                  </span>
                </div>

                {order.paymentReference && (
                  <div className="mt-5 border-t border-zinc-100 pt-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                      Payment reference
                    </p>

                    <p className="mt-2 break-all text-xs font-bold text-zinc-700">
                      {order.paymentReference}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SUPPORT */}
            <div className="rounded-[2rem] bg-pink-100 p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl">
                💗
              </div>

              <h3 className="mt-5 text-xl font-black tracking-tight">
                Need help?
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Have a question about your order or delivery? We're
                happy to help.
              </p>

              <Link
                href="/"
                className="mt-5 inline-flex rounded-full bg-zinc-950 px-5 py-3 text-xs font-black text-white transition hover:bg-pink-600"
              >
                Contact Molippy
              </Link>
            </div>

            {/* SHOP */}
            <Link
              href="/products"
              className="group flex items-center justify-between rounded-[2rem] border border-pink-200 bg-white p-6 transition hover:border-pink-400 hover:bg-pink-50"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-600">
                  Keep shopping
                </p>

                <p className="mt-1 font-black text-zinc-900">
                  Discover more lip love
                </p>
              </div>

              <span className="text-xl transition group-hover:translate-x-1">
                →
              </span>
            </Link>
          </aside>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-pink-100 bg-white px-5 py-10 text-center">
        <p className="text-xl font-black tracking-[-0.05em]">
          MOLIPPY
          <span className="text-pink-600">.</span>
        </p>

        <p className="mt-2 text-sm text-zinc-500">
          Where beauty meets confidence.
        </p>
      </footer>
    </main>
  );
}