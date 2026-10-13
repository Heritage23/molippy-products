"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    images?: string[] | null;
  };
};

type Order = {
  id: string;
  total: number;
  status: OrderStatus;
  paymentReference?: string | null;
  shippingName?: string | null;
  shippingEmail?: string | null;
  shippingPhone?: string | null;
  shippingAddress?: string | null;
  createdAt: string;
  items: OrderItem[];
};

const PINK = "#f51b78";
const MUTED = "#a6a0ae";
const BORDER = "rgba(255,255,255,0.09)";
const PANEL = "#17151d";

const statuses: OrderStatus[] = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const statusColors: Record<
  OrderStatus,
  { color: string; background: string; border: string }
> = {
  PENDING: {
    color: "#f5c56a",
    background: "rgba(245,197,106,0.10)",
    border: "rgba(245,197,106,0.24)",
  },
  PAID: {
    color: "#6ee7a2",
    background: "rgba(110,231,162,0.10)",
    border: "rgba(110,231,162,0.23)",
  },
  PROCESSING: {
    color: "#c5a4ff",
    background: "rgba(197,164,255,0.10)",
    border: "rgba(197,164,255,0.24)",
  },
  SHIPPED: {
    color: "#7bc5ff",
    background: "rgba(123,197,255,0.10)",
    border: "rgba(123,197,255,0.24)",
  },
  DELIVERED: {
    color: "#ff8bc0",
    background: "rgba(245,27,120,0.12)",
    border: "rgba(245,27,120,0.25)",
  },
  CANCELLED: {
    color: "#ff8989",
    background: "rgba(255,100,100,0.10)",
    border: "rgba(255,100,100,0.23)",
  },
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: string) {
  return id.length > 12 ? id.slice(0, 12).toUpperCase() : id.toUpperCase();
}

function getStatusLabel(status: OrderStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getProgress(status: OrderStatus) {
  const stages: OrderStatus[] = [
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
  ];

  if (status === "CANCELLED") return -1;
  return stages.indexOf(status);
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors = statusColors[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 12px",
        borderRadius: 999,
        background: colors.background,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.7,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: colors.color,
          boxShadow: `0 0 8px ${colors.color}`,
        }}
      />
      {getStatusLabel(status)}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 22,
      }}
    >
      <div>
        <p
          style={{
            margin: "0 0 6px",
            color: PINK,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
        <h2
          style={{
            margin: 0,
            color: "#fff",
            fontSize: 19,
            fontWeight: 750,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load this order.");
      }

      if (!data.order) {
        throw new Error("Order details could not be found.");
      }

      setOrder(data.order);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading this order."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function updateStatus(status: OrderStatus) {
    if (!order || updating || status === order.status) return;

    setUpdating(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update order status.");
      }

      setOrder(data.order);
      setMessage(`Order status updated to ${getStatusLabel(status)}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating the order."
      );
    } finally {
      setUpdating(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 20,
    padding: 24,
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    margin: "0 0 8px",
    color: MUTED,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.5,
  };

  const valueStyle: React.CSSProperties = {
    margin: 0,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.7,
    overflowWrap: "anywhere",
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#100e14",
          color: "#fff",
          padding: "48px 24px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              background: "rgba(245,27,120,0.13)",
              display: "grid",
              placeItems: "center",
              color: PINK,
              fontSize: 25,
              marginBottom: 24,
            }}
          >
            ♡
          </div>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>
            Preparing your order details
          </h1>
          <p style={{ color: MUTED, fontSize: 13 }}>
            Loading your Molippy order...
          </p>
          <div
            style={{
              height: 3,
              maxWidth: 320,
              marginTop: 24,
              borderRadius: 10,
              background: `linear-gradient(90deg, ${PINK}, #74113f)`,
            }}
          />
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#100e14",
          color: "#fff",
          padding: 24,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "80px auto",
            padding: 32,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            background: PANEL,
            textAlign: "center",
          }}
        >
          <div style={{ color: PINK, fontSize: 38, marginBottom: 12 }}>♡</div>
          <h1 style={{ fontSize: 23, margin: "0 0 12px" }}>
            We couldn't load this order
          </h1>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.8 }}>
            {error}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 24,
            }}
          >
            <button
              onClick={loadOrder}
              style={primaryButton}
            >
              Try again
            </button>
            <button
              onClick={() => router.push("/admin/orders")}
              style={secondaryButton}
            >
              Back to orders
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!order) return null;

  const itemCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
  const subtotal = order.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const progress = getProgress(order.status);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top left, rgba(245,27,120,0.09), transparent 32%), #100e14",
        color: "#fff",
        padding: "28px clamp(16px, 3vw, 40px) 56px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Top navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingBottom: 24,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 43,
                height: 43,
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                color: "#fff",
                fontSize: 23,
                background: `linear-gradient(135deg, ${PINK}, #a40b51)`,
                boxShadow: "0 8px 26px rgba(245,27,120,0.2)",
              }}
            >
              ♡
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: 2,
                }}
              >
                MOLIPPY
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: MUTED,
                  fontSize: 9,
                  letterSpacing: 2,
                }}
              >
                PRODUCTS · ADMIN
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/admin/orders")}
            style={secondaryButton}
          >
            <span style={{ fontSize: 17 }}>←</span> All orders
          </button>
        </div>

        {/* Page heading */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 20,
            flexWrap: "wrap",
            padding: "34px 0 28px",
          }}
        >
          <div>
            <p
              style={{
                color: PINK,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 2.5,
                margin: "0 0 12px",
                textTransform: "uppercase",
              }}
            >
              Order management
            </p>
            <h1
              style={{
                fontSize: "clamp(27px, 4vw, 40px)",
                lineHeight: 1.15,
                letterSpacing: -1.5,
                margin: "0 0 12px",
                fontWeight: 850,
              }}
            >
              Order <span style={{ color: PINK }}>#{shortId(order.id)}</span>
            </h1>
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
              Review the purchase, manage fulfilment, and keep your customer
              updated.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 9,
            }}
          >
            <StatusBadge status={order.status} />
            <span style={{ color: MUTED, fontSize: 11 }}>
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={alertStyle("error")}>
            <span>!</span> {error}
          </div>
        )}
        {message && (
          <div style={alertStyle("success")}>
            <span>✓</span> {message}
          </div>
        )}

        {/* Overview cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={metricCard}>
            <div style={metricIcon}>₦</div>
            <p style={metricLabel}>Order total</p>
            <p style={metricValue}>{formatMoney(order.total)}</p>
            <p style={metricFoot}>Total amount charged</p>
          </div>

          <div style={metricCard}>
            <div style={metricIcon}>▤</div>
            <p style={metricLabel}>Items ordered</p>
            <p style={metricValue}>{itemCount}</p>
            <p style={metricFoot}>
              {order.items.length} product{order.items.length === 1 ? "" : "s"}
            </p>
          </div>

          <div style={metricCard}>
            <div style={metricIcon}>◷</div>
            <p style={metricLabel}>Order placed</p>
            <p style={{ ...metricValue, fontSize: 19 }}>
              {formatDate(order.createdAt)}
            </p>
            <p style={metricFoot}>{formatTime(order.createdAt)}</p>
          </div>

          <div style={metricCard}>
            <div style={metricIcon}>♡</div>
            <p style={metricLabel}>Order status</p>
            <div style={{ marginTop: 10 }}>
              <StatusBadge status={order.status} />
            </div>
            <p style={metricFoot}>Current fulfilment stage</p>
          </div>
        </div>

        {/* Order progress */}
        <section style={{ ...cardStyle, marginBottom: 24 }}>
          <SectionTitle eyebrow="Fulfilment" title="Order journey" />

          {order.status === "CANCELLED" ? (
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                background: "rgba(255,100,100,0.08)",
                border: "1px solid rgba(255,100,100,0.2)",
                color: "#ff8989",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ✕ This order has been cancelled.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {(
                [
                  ["PENDING", "Received", "01"],
                  ["PAID", "Payment", "02"],
                  ["PROCESSING", "Preparing", "03"],
                  ["SHIPPED", "Shipped", "04"],
                  ["DELIVERED", "Delivered", "05"],
                ] as [OrderStatus, string, string][]
              ).map(([status, label, number], index) => {
                const complete = index <= progress;
                const current = index === progress;

                return (
                  <div key={status} style={{ minWidth: 0 }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 10,
                        background: complete ? PINK : "#302b36",
                        marginBottom: 14,
                        boxShadow: current
                          ? "0 0 12px rgba(245,27,120,0.4)"
                          : "none",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 7,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: complete ? PINK : "#6f6879",
                        }}
                      >
                        {complete ? "✓" : number}
                      </span>
                      {current && (
                        <span
                          style={{
                            color: PINK,
                            fontSize: 8,
                            fontWeight: 800,
                            letterSpacing: 0.5,
                          }}
                        >
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        color: complete ? "#fff" : MUTED,
                        fontSize: "clamp(9px, 1.5vw, 12px)",
                        fontWeight: complete ? 700 : 500,
                        margin: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Main content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(280px, 0.85fr)",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 24, minWidth: 0 }}>
            {/* Products */}
            <section style={cardStyle}>
              <SectionTitle
                eyebrow="Purchase details"
                title="Items in this order"
                right={
                  <span
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      background: "#211d27",
                      border: `1px solid ${BORDER}`,
                      padding: "8px 11px",
                      borderRadius: 10,
                    }}
                  >
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </span>
                }
              />

              {order.items.length === 0 ? (
                <p style={{ color: MUTED, fontSize: 13 }}>
                  No products were found for this order.
                </p>
              ) : (
                <div>
                  {order.items.map((item, index) => {
                    const image = item.product.images?.[0];

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "64px minmax(0, 1fr) auto",
                          gap: 15,
                          alignItems: "center",
                          padding: "18px 0",
                          borderTop:
                            index === 0 ? "none" : `1px solid ${BORDER}`,
                        }}
                      >
                        <div
                          style={{
                            width: 64,
                            height: 72,
                            borderRadius: 14,
                            background:
                              "linear-gradient(145deg, #38202e, #211923)",
                            border: `1px solid ${BORDER}`,
                            overflow: "hidden",
                            display: "grid",
                            placeItems: "center",
                            color: PINK,
                            fontSize: 25,
                          }}
                        >
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image}
                              alt={item.product.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            "♡"
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 750,
                              margin: "0 0 8px",
                              lineHeight: 1.5,
                            }}
                          >
                            {item.product.name}
                          </p>
                          <p
                            style={{
                              color: MUTED,
                              fontSize: 11,
                              margin: "0 0 6px",
                            }}
                          >
                            Unit price: {formatMoney(item.price)}
                          </p>
                          <span
                            style={{
                              display: "inline-block",
                              background: "rgba(245,27,120,0.10)",
                              color: "#ff8bc0",
                              borderRadius: 7,
                              padding: "5px 8px",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            Qty: {item.quantity}
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 800,
                              margin: "0 0 5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatMoney(item.price * item.quantity)}
                          </p>
                          <p
                            style={{
                              color: MUTED,
                              fontSize: 10,
                              margin: 0,
                            }}
                          >
                            Line total
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  paddingTop: 18,
                  marginTop: 8,
                  display: "grid",
                  gap: 13,
                }}
              >
                <SummaryRow label="Items subtotal" value={formatMoney(subtotal)} />
                <SummaryRow
                  label="Total items"
                  value={String(itemCount)}
                />
                <div
                  style={{
                    height: 1,
                    background: BORDER,
                    margin: "3px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>
                    Order total
                  </span>
                  <span
                    style={{
                      color: PINK,
                      fontSize: 22,
                      fontWeight: 900,
                      letterSpacing: -0.5,
                    }}
                  >
                    {formatMoney(order.total)}
                  </span>
                </div>
                {subtotal !== order.total && (
                  <p
                    style={{
                      color: MUTED,
                      fontSize: 10,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    The final total differs from the item subtotal. Check your
                    checkout calculation for any shipping, discount, or other
                    charges.
                  </p>
                )}
              </div>
            </section>

            {/* Customer */}
            <section style={cardStyle}>
              <SectionTitle
                eyebrow="Customer information"
                title="Who placed this order?"
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                  background: "#211b26",
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 19,
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${PINK}, #74113f)`,
                  }}
                >
                  {(order.shippingName || "C").trim().charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: "0 0 5px",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 800,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {order.shippingName || "Customer name not provided"}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: MUTED,
                      fontSize: 11,
                      overflowWrap: "anywhere",
                    }}
                  >
                    Customer for order #{shortId(order.id)}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 22,
                }}
              >
                <div>
                  <p style={labelStyle}>Email address</p>
                  <p style={valueStyle}>
                    {order.shippingEmail || "Not provided"}
                  </p>
                </div>
                <div>
                  <p style={labelStyle}>Phone number</p>
                  <p style={valueStyle}>
                    {order.shippingPhone || "Not provided"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <aside style={{ display: "grid", gap: 24, minWidth: 0 }}>
            {/* Status management */}
            <section
              style={{
                ...cardStyle,
                background:
                  "linear-gradient(145deg, rgba(245,27,120,0.10), #17151d 60%)",
              }}
            >
              <SectionTitle eyebrow="Take action" title="Manage order" />

              <p
                style={{
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 1.8,
                  margin: "0 0 17px",
                }}
              >
                Update the order status as you confirm payment and prepare the
                customer&apos;s package.
              </p>

              <label
                htmlFor="order-status"
                style={{
                  display: "block",
                  color: "#e9e3ed",
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 9,
                }}
              >
                Order status
              </label>

              <select
                id="order-status"
                value={order.status}
                disabled={updating}
                onChange={(event) =>
                  updateStatus(event.target.value as OrderStatus)
                }
                style={{
                  width: "100%",
                  padding: "13px 12px",
                  background: "#211d27",
                  border: `1px solid ${BORDER}`,
                  color: "#fff",
                  borderRadius: 12,
                  fontSize: 12,
                  outline: "none",
                  cursor: updating ? "wait" : "pointer",
                  opacity: updating ? 0.65 : 1,
                }}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>

              {updating && (
                <p
                  style={{
                    color: "#ff8bc0",
                    fontSize: 11,
                    margin: "12px 0 0",
                  }}
                >
                  Updating order status...
                </p>
              )}

              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  marginTop: 22,
                  paddingTop: 18,
                }}
              >
                <p style={{ ...labelStyle, marginBottom: 12 }}>
                  Quick status reference
                </p>
                <div style={{ display: "grid", gap: 11 }}>
                  {[
                    ["PAID", "Payment confirmed"],
                    ["PROCESSING", "Preparing package"],
                    ["SHIPPED", "Package dispatched"],
                    ["DELIVERED", "Customer received order"],
                  ].map(([status, description]) => (
                    <div
                      key={status}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            statusColors[status as OrderStatus].color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          color: "#e4dfe8",
                          fontSize: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        {description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Shipping */}
            <section style={cardStyle}>
              <SectionTitle eyebrow="Delivery" title="Shipping address" />

              <div
                style={{
                  width: 43,
                  height: 43,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 13,
                  background: "rgba(245,27,120,0.12)",
                  color: PINK,
                  fontSize: 20,
                  marginBottom: 16,
                }}
              >
                ↗
              </div>

              <p
                style={{
                  color: "#fff",
                  fontSize: 13,
                  lineHeight: 1.9,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  margin: 0,
                }}
              >
                {order.shippingAddress || "No shipping address provided."}
              </p>

              {order.shippingPhone && (
                <div
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    marginTop: 18,
                    paddingTop: 16,
                  }}
                >
                  <p style={labelStyle}>Contact for delivery</p>
                  <p style={valueStyle}>{order.shippingPhone}</p>
                </div>
              )}
            </section>

            {/* Payment */}
            <section style={cardStyle}>
              <SectionTitle eyebrow="Transaction" title="Payment details" />

              <div style={{ display: "grid", gap: 18 }}>
                <div>
                  <p style={labelStyle}>Payment reference</p>
                  <p
                    style={{
                      ...valueStyle,
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: order.paymentReference ? "#ff8bc0" : MUTED,
                    }}
                  >
                    {order.paymentReference || "No reference available"}
                  </p>
                </div>

                <div>
                  <p style={labelStyle}>Order ID</p>
                  <p
                    style={{
                      ...valueStyle,
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  >
                    {order.id}
                  </p>
                </div>

                <div>
                  <p style={labelStyle}>Recorded order date</p>
                  <p style={valueStyle}>
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                <div>
                  <p style={labelStyle}>Order amount</p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 23,
                      fontWeight: 900,
                      color: PINK,
                    }}
                  >
                    {formatMoney(order.total)}
                  </p>
                </div>
              </div>
            </section>

            {/* Brand card */}
            <section
              style={{
                position: "relative",
                overflow: "hidden",
                background:
                  "linear-gradient(135deg, #f51b78 0%, #b80d5b 55%, #74113f 100%)",
                borderRadius: 20,
                padding: 25,
                boxShadow: "0 15px 35px rgba(245,27,120,0.13)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -15,
                  top: -35,
                  fontSize: 115,
                  color: "rgba(255,255,255,0.10)",
                  lineHeight: 1,
                }}
              >
                ♡
              </div>
              <p
                style={{
                  position: "relative",
                  margin: "0 0 10px",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 2,
                }}
              >
                MOLIPPY PRODUCTS
              </p>
              <h3
                style={{
                  position: "relative",
                  margin: "0 0 10px",
                  fontSize: 23,
                  lineHeight: 1.2,
                  fontWeight: 900,
                  letterSpacing: -0.7,
                }}
              >
                Beauty meets
                <br />
                confidence.
              </h3>
              <p
                style={{
                  position: "relative",
                  margin: 0,
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 11,
                  lineHeight: 1.8,
                }}
              >
                Every order is another reason to feel good in your skin.
              </p>
            </section>
          </aside>
        </div>

        <footer
          style={{
            marginTop: 36,
            paddingTop: 22,
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            color: MUTED,
            fontSize: 10,
          }}
        >
          <span>© {new Date().getFullYear()} Molippy Products</span>
          <span>Made for your soft lip era ♡</span>
        </footer>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          main > div > div:nth-of-type(4) {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          main {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }

        button,
        select {
          font-family: inherit;
        }

        button {
          transition:
            transform 160ms ease,
            opacity 160ms ease,
            border-color 160ms ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
          opacity: 0.92;
        }

        button:disabled {
          cursor: not-allowed;
        }

        select:focus {
          border-color: ${PINK} !important;
        }
      `}</style>
    </main>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <span style={{ color: "#aaa3b3", fontSize: 12 }}>{label}</span>
      <span
        style={{
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  border: "none",
  borderRadius: 12,
  padding: "12px 17px",
  color: "#fff",
  background: PINK,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: "11px 15px",
  color: "#fff",
  background: "#1b1821",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const metricCard: React.CSSProperties = {
  minWidth: 0,
  padding: 21,
  background: PANEL,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
};

const metricIcon: React.CSSProperties = {
  width: 37,
  height: 37,
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  color: "#ff8bc0",
  background: "rgba(245,27,120,0.11)",
  fontSize: 17,
  fontWeight: 800,
  marginBottom: 17,
};

const metricLabel: React.CSSProperties = {
  margin: "0 0 9px",
  color: MUTED,
  fontSize: 11,
  fontWeight: 600,
};

const metricValue: React.CSSProperties = {
  margin: 0,
  color: "#fff",
  fontSize: 25,
  fontWeight: 900,
  letterSpacing: -0.7,
  overflowWrap: "anywhere",
};

const metricFoot: React.CSSProperties = {
  margin: "9px 0 0",
  color: "#81798b",
  fontSize: 10,
  lineHeight: 1.6,
};

function alertStyle(type: "error" | "success"): React.CSSProperties {
  const isError = type === "error";

  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "13px 15px",
    borderRadius: 12,
    marginBottom: 18,
    background: isError
      ? "rgba(255,100,100,0.08)"
      : "rgba(110,231,162,0.08)",
    border: `1px solid ${
      isError ? "rgba(255,100,100,0.23)" : "rgba(110,231,162,0.22)"
    }`,
    color: isError ? "#ff9898" : "#8ce9b1",
    fontSize: 12,
    lineHeight: 1.6,
  };
}
