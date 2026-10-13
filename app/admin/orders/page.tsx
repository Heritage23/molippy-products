"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  total: number;
  status: string;
  shippingName: string | null;
  shippingEmail: string | null;
  createdAt: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
};

type OrdersData = {
  orders: Order[];
  stats: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    totalSales: number;
  };
  inventory: {
    products: Product[];
    lowStockProducts: Product[];
  };
};

const statusOptions = [
  "ALL",
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const money = (amount: number) =>
  `₦${(amount / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  const colors: Record<string, { bg: string; color: string; dot: string }> = {
    PAID: { bg: "#153b2c", color: "#78e4ad", dot: "#78e4ad" },
    PROCESSING: { bg: "#332547", color: "#d4a7ff", dot: "#d4a7ff" },
    SHIPPED: { bg: "#1b3046", color: "#8ecbff", dot: "#8ecbff" },
    DELIVERED: { bg: "#153b2c", color: "#78e4ad", dot: "#78e4ad" },
    CANCELLED: { bg: "#47202c", color: "#ff91a9", dot: "#ff91a9" },
    PENDING: { bg: "#45351c", color: "#ffd078", dot: "#ffd078" },
  };

  const selected = colors[normalized] ?? colors.PENDING;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 11px",
        borderRadius: 30,
        background: selected.bg,
        color: selected.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        letterSpacing: 0.2,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: selected.dot,
        }}
      />
      {formatStatus(status)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  note,
  symbol,
  accent = "#f64e96",
}: {
  label: string;
  value: string;
  note: string;
  symbol: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg, #211521, #181019)",
        border: "1px solid #352435",
        borderRadius: 18,
        padding: "23px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span style={{ color: "#b9aab9", fontSize: 12 }}>{label}</span>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 35,
            height: 35,
            borderRadius: 11,
            background: `${accent}18`,
            color: accent,
            fontSize: 18,
          }}
        >
          {symbol}
        </span>
      </div>

      <div
        style={{
          color: "#fff8fc",
          fontSize: "clamp(25px, 3vw, 34px)",
          fontWeight: 750,
          letterSpacing: -1,
          marginTop: 18,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div style={{ color: "#8e7e8e", fontSize: 11, marginTop: 9 }}>
        {note}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Unable to load orders.");
        return;
      }

      setData(result);
    } catch (error) {
      console.error("Admin orders error:", error);
      setMessage("Unable to load orders. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (!data) return [];

    const searchText = search.toLowerCase().trim();

    return data.orders.filter((order) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        order.status.toUpperCase() === statusFilter;

      const matchesSearch =
        !searchText ||
        order.id.toLowerCase().includes(searchText) ||
        (order.shippingName || "").toLowerCase().includes(searchText) ||
        (order.shippingEmail || "").toLowerCase().includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  const pendingCount = data?.stats.pendingOrders ?? 0;

  return (
    <main className="molippy-orders" style={styles.page}>
      <style jsx global>{`
        .molippy-orders * {
          box-sizing: border-box;
        }

        .molippy-orders input,
        .molippy-orders select,
        .molippy-orders button {
          font: inherit;
        }

        .molippy-orders input:focus,
        .molippy-orders select:focus {
          outline: 1px solid #f64e96;
          border-color: #f64e96 !important;
        }

        .molippy-orders .order-row:hover {
          background: #241824;
        }

        .molippy-orders .pink-action:hover {
          background: #ff70ad !important;
          color: #190b14 !important;
        }

        .molippy-orders .refresh-action:hover {
          border-color: #f64e96 !important;
          color: #ff8cba !important;
        }

        .molippy-orders .order-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .molippy-orders .order-table th {
          color: #9e8c9e;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.1px;
          font-weight: 700;
          padding: 17px 18px;
          white-space: nowrap;
          background: #1b121d;
          border-bottom: 1px solid #382639;
        }

        .molippy-orders .order-table td {
          padding: 19px 18px;
          border-bottom: 1px solid #302130;
          color: #eee2ed;
          font-size: 12px;
          vertical-align: middle;
        }

        .molippy-orders .order-table tr:last-child td {
          border-bottom: none;
        }

        .molippy-orders .order-row {
          transition: background 160ms ease;
        }

        .molippy-orders .search-box {
          width: 100%;
          min-width: 0;
          background: #130d15;
          border: 1px solid #3a293b;
          border-radius: 11px;
          padding: 13px 14px;
          color: #fff8fc;
          font-size: 12px;
        }

        .molippy-orders .filter-select {
          width: 100%;
          background: #130d15;
          border: 1px solid #3a293b;
          border-radius: 11px;
          padding: 13px 14px;
          color: #f6eaf4;
          font-size: 12px;
          cursor: pointer;
        }

        .molippy-orders .filter-select option {
          background: #1b121d;
          color: #fff;
        }

        @media (max-width: 640px) {
          .molippy-orders .orders-header {
            align-items: flex-start !important;
          }

          .molippy-orders .orders-title {
            font-size: 34px !important;
          }

          .molippy-orders .orders-content {
            padding: 24px 15px 45px !important;
          }

          .molippy-orders .orders-filters {
            grid-template-columns: 1fr !important;
          }

          .molippy-orders .metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .molippy-orders .metric-grid > div {
            padding: 16px !important;
          }

          .molippy-orders .metric-grid > div > div:nth-child(2) {
            font-size: 24px !important;
          }
        }
      `}</style>

      <div className="orders-content" style={styles.content}>
        <header className="orders-header" style={styles.header}>
          <div>
            <a href="/admin" style={styles.backLink}>
              <span style={{ fontSize: 17 }}>←</span> Dashboard
            </a>

            <div style={styles.eyebrow}>
              <span style={styles.eyebrowLine} />
              MOLIPPY PRODUCTS / OPERATIONS
            </div>

            <h1 className="orders-title" style={styles.title}>
              Manage <span style={{ color: "#f64e96" }}>Orders.</span>
            </h1>

            <p style={styles.subtitle}>
              Every order, every detail. Keep your Molippy girl experience
              exceptional.
            </p>
          </div>

          <button
            onClick={() => void loadOrders()}
            disabled={loading}
            className="refresh-action"
            style={{
              ...styles.refreshButton,
              opacity: loading ? 0.65 : 1,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            <span style={{ fontSize: 17 }}>↻</span>
            {loading ? "Refreshing..." : "Refresh orders"}
          </button>
        </header>

        {message && (
          <div style={styles.errorBox}>
            <div>
              <strong style={{ color: "#ff9ebf" }}>
                We couldn’t load your orders
              </strong>
              <p style={{ color: "#c9b5c4", fontSize: 12, marginBottom: 0 }}>
                {message}
              </p>
            </div>
            <button
              onClick={() => void loadOrders()}
              className="pink-action"
              style={styles.retryButton}
            >
              Try again
            </button>
          </div>
        )}

        {!data && loading && (
          <div style={styles.loadingPanel}>
            <div style={styles.loadingMark}>M</div>
            <h2 style={{ color: "#fff5fb", fontSize: 19 }}>
              Preparing your orders...
            </h2>
            <p style={{ color: "#9f8b9d", fontSize: 12 }}>
              Getting everything ready for you.
            </p>
          </div>
        )}

        {data && (
          <>
            <section className="metric-grid" style={styles.metricGrid}>
              <MetricCard
                label="Total orders"
                value={data.stats.totalOrders.toLocaleString("en-NG")}
                note="All customer orders"
                symbol="↗"
              />

              <MetricCard
                label="Paid orders"
                value={data.stats.paidOrders.toLocaleString("en-NG")}
                note="Successfully paid"
                symbol="✓"
                accent="#7ee5b0"
              />

              <MetricCard
                label="Awaiting action"
                value={pendingCount.toLocaleString("en-NG")}
                note={pendingCount > 0 ? "Needs your attention" : "All caught up"}
                symbol="◷"
                accent="#ffca73"
              />

              <MetricCard
                label="Total sales"
                value={money(data.stats.totalSales)}
                note="Sales from paid orders"
                symbol="₦"
                accent="#c5a0ff"
              />
            </section>

            <section style={styles.ordersPanel}>
              <div style={styles.panelHeading}>
                <div>
                  <div style={styles.sectionEyebrow}>YOUR STORE</div>
                  <h2 style={styles.panelTitle}>Order management</h2>
                  <p style={styles.panelSubtitle}>
                    Search, review and keep track of customer purchases.
                  </p>
                </div>

                <span style={styles.orderCount}>
                  {filteredOrders.length}{" "}
                  {filteredOrders.length === 1 ? "ORDER" : "ORDERS"}
                </span>
              </div>

              <div className="orders-filters" style={styles.filters}>
                <div style={{ position: "relative", minWidth: 0 }}>
                  <span style={styles.searchIcon}>⌕</span>
                  <input
                    className="search-box"
                    type="search"
                    placeholder="Search name, email or order ID..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Search orders"
                    style={{ paddingLeft: 40 }}
                  />
                </div>

                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter orders by status"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL"
                        ? "All order statuses"
                        : formatStatus(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.resultsLine}>
                <span>
                  Showing{" "}
                  <strong style={{ color: "#f7eaf4" }}>
                    {filteredOrders.length}
                  </strong>{" "}
                  of {data.orders.length} orders
                </span>

                {(search || statusFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                    }}
                    style={styles.clearButton}
                  >
                    Clear filters ×
                  </button>
                )}
              </div>

              {filteredOrders.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>♡</div>
                  <h3 style={{ color: "#fff1f8", margin: "12px 0 7px" }}>
                    {data.orders.length === 0
                      ? "Your orders will appear here"
                      : "No matching orders"}
                  </h3>
                  <p
                    style={{
                      color: "#a38fa1",
                      fontSize: 12,
                      lineHeight: 1.7,
                      maxWidth: 340,
                      margin: "0 auto",
                    }}
                  >
                    {data.orders.length === 0
                      ? "When customers place orders, you’ll be able to manage them from this page."
                      : "Try another search or clear your filters to see more orders."}
                  </p>
                  {(search || statusFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("ALL");
                      }}
                      className="pink-action"
                      style={styles.emptyAction}
                    >
                      View all orders
                    </button>
                  )}
                </div>
              ) : (
                <div style={styles.tableScroll}>
                  <table className="order-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Order reference</th>
                        <th>Order total</th>
                        <th>Status</th>
                        <th>Order date</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="order-row">
                          <td>
                            <div style={styles.customerCell}>
                              <div style={styles.avatar}>
                                {(order.shippingName || "M")
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={styles.customerName}>
                                  {order.shippingName || "Unnamed customer"}
                                </div>
                                <div style={styles.customerEmail}>
                                  {order.shippingEmail || "No email provided"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span style={styles.orderId}>
                              #{order.id.length > 12
                                ? order.id.slice(-8).toUpperCase()
                                : order.id.toUpperCase()}
                            </span>
                          </td>

                          <td>
                            <span style={styles.amount}>
                              {money(order.total)}
                            </span>
                          </td>

                          <td>
                            <StatusBadge status={order.status} />
                          </td>

                          <td>
                            <div style={{ color: "#e4d5e1", fontSize: 12 }}>
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-NG",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </div>
                          </td>

                          <td>
                            <a
                              href={`/admin/orders/${order.id}`}
                              className="pink-action"
                              style={styles.viewButton}
                            >
                              View order <span>↗</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <footer style={styles.panelFooter}>
                <span>MADE WITH ♡ FOR THE MOLIPPY GIRL</span>
                <span>ORDERS & FULFILMENT</span>
              </footer>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#100b10",
    color: "#fff8fc",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  content: {
    maxWidth: 1500,
    margin: "0 auto",
    padding: "42px clamp(16px, 3.5vw, 48px) 65px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
    marginBottom: 34,
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "#b7a5b6",
    textDecoration: "none",
    fontSize: 12,
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#c9a4bb",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    marginTop: 28,
  },
  eyebrowLine: {
    display: "inline-block",
    width: 23,
    height: 2,
    background: "#f64e96",
  },
  title: {
    fontSize: "clamp(34px, 4.5vw, 51px)",
    letterSpacing: -2.2,
    lineHeight: 1.1,
    margin: "12px 0 0",
    fontWeight: 800,
  },
  subtitle: {
    color: "#aa99a8",
    fontSize: 13,
    lineHeight: 1.8,
    margin: "13px 0 0",
    maxWidth: 560,
  },
  refreshButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #453144",
    borderRadius: 11,
    background: "#1c131e",
    color: "#f5e6f1",
    padding: "12px 16px",
    fontSize: 12,
    fontWeight: 700,
    transition: "all 160ms ease",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  ordersPanel: {
    marginTop: 28,
    border: "1px solid #382638",
    borderRadius: 19,
    overflow: "hidden",
    background: "#1b121d",
  },
  panelHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap",
    padding: "25px 25px 20px",
  },
  sectionEyebrow: {
    color: "#f64e96",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 2,
  },
  panelTitle: {
    color: "#fff5fb",
    fontSize: 20,
    letterSpacing: -0.5,
    margin: "8px 0 0",
  },
  panelSubtitle: {
    color: "#a18e9f",
    fontSize: 12,
    lineHeight: 1.7,
    margin: "7px 0 0",
  },
  orderCount: {
    color: "#ff86b6",
    background: "#3a1a2d",
    border: "1px solid #592440",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 220px",
    gap: 12,
    padding: "0 25px 18px",
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    top: 8,
    fontSize: 23,
    color: "#a48b9e",
    pointerEvents: "none",
  },
  resultsLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "14px 25px",
    color: "#a28da0",
    fontSize: 11,
    borderTop: "1px solid #302130",
    borderBottom: "1px solid #302130",
  },
  clearButton: {
    border: 0,
    background: "transparent",
    color: "#ff86b6",
    fontSize: 11,
    cursor: "pointer",
  },
  tableScroll: {
    overflowX: "auto",
    width: "100%",
  },
  customerCell: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    minWidth: 180,
  },
  avatar: {
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    width: 36,
    height: 36,
    borderRadius: 12,
    color: "#ffb3d2",
    background: "linear-gradient(145deg, #49223a, #2b1728)",
    border: "1px solid #63324e",
    fontSize: 13,
    fontWeight: 800,
  },
  customerName: {
    color: "#fff0f8",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
  },
  customerEmail: {
    color: "#9f8a9d",
    fontSize: 10,
    overflowWrap: "anywhere",
  },
  orderId: {
    color: "#e7b6d0",
    background: "#2b1b2b",
    border: "1px solid #453047",
    borderRadius: 6,
    padding: "6px 8px",
    fontFamily: "monospace",
    fontSize: 10,
    whiteSpace: "nowrap",
  },
  amount: {
    color: "#fff5fb",
    fontWeight: 750,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  viewButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    color: "#ff91bd",
    border: "1px solid #65314e",
    background: "#321a2a",
    borderRadius: 8,
    textDecoration: "none",
    padding: "9px 11px",
    fontSize: 10,
    fontWeight: 700,
    transition: "all 160ms ease",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
  },
  emptyIcon: {
    display: "grid",
    placeItems: "center",
    width: 58,
    height: 58,
    margin: "0 auto",
    borderRadius: 19,
    background: "#321a2a",
    border: "1px solid #61324b",
    color: "#ff8cba",
    fontSize: 29,
  },
  emptyAction: {
    marginTop: 18,
    background: "#f64e96",
    color: "#1a0c15",
    border: 0,
    borderRadius: 9,
    padding: "11px 16px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  panelFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "15px 25px",
    background: "#171019",
    borderTop: "1px solid #302130",
    color: "#7e697c",
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.1,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 15,
    padding: 20,
    marginBottom: 22,
    borderRadius: 13,
    border: "1px solid #673044",
    background: "#28151e",
  },
  retryButton: {
    padding: "10px 14px",
    border: 0,
    borderRadius: 8,
    background: "#f64e96",
    color: "#1a0c15",
    fontWeight: 800,
    fontSize: 11,
    cursor: "pointer",
  },
  loadingPanel: {
    textAlign: "center",
    padding: "65px 20px",
    background: "#1b121d",
    border: "1px solid #382638",
    borderRadius: 18,
    marginTop: 25,
  },
  loadingMark: {
    display: "grid",
    placeItems: "center",
    width: 50,
    height: 50,
    margin: "0 auto 20px",
    background: "#f64e96",
    color: "#1a0c15",
    borderRadius: 16,
    fontSize: 23,
    fontWeight: 900,
  },
};