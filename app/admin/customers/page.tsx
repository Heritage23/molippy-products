"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
};

const money = (amount: number) =>
  `₦${(amount / 100).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = "#f64e96",
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  accent?: string;
}) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricTop}>
        <span style={styles.metricLabel}>{label}</span>
        <span
          style={{
            ...styles.metricIcon,
            color: accent,
            background: `${accent}18`,
          }}
        >
          {icon}
        </span>
      </div>
      <div style={styles.metricValue}>{value}</div>
      <p style={styles.metricDetail}>{detail}</p>
    </div>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/customers", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Unable to load customers.");
        return;
      }

      if (!Array.isArray(result)) {
        setMessage("Invalid customer data received.");
        return;
      }

      setCustomers(result);
    } catch (error) {
      console.error("Customers page error:", error);
      setMessage("Unable to load customers. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const totalRevenue = customers.reduce(
    (total, customer) => total + customer.totalSpent,
    0
  );

  const totalOrders = customers.reduce(
    (total, customer) => total + customer.orderCount,
    0
  );

  const activeCustomers = customers.filter(
    (customer) => customer.orderCount > 0
  ).length;

  const averageSpend =
    customers.length > 0 ? totalRevenue / customers.length : 0;

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = customers.filter((customer) => {
      return (
        !term ||
        (customer.name || "").toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.id.toLowerCase().includes(term)
      );
    });

    return [...result].sort((a, b) => {
      if (sortBy === "highest-spend") {
        return b.totalSpent - a.totalSpent;
      }

      if (sortBy === "most-orders") {
        return b.orderCount - a.orderCount;
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );
      }

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });
  }, [customers, search, sortBy]);

  return (
    <main className="molippy-customers" style={styles.page}>
      <style jsx global>{`
        .molippy-customers * {
          box-sizing: border-box;
        }

        .molippy-customers input,
        .molippy-customers select,
        .molippy-customers button {
          font: inherit;
        }

        .molippy-customers input:focus,
        .molippy-customers select:focus {
          outline: 1px solid #f64e96;
          border-color: #f64e96 !important;
        }

        .molippy-customers .customer-row {
          transition: background 160ms ease;
        }

        .molippy-customers .customer-row:hover {
          background: #251825;
        }

        .molippy-customers .customer-search,
        .molippy-customers .customer-sort {
          width: 100%;
          min-width: 0;
          border: 1px solid #3a293b;
          background: #130d15;
          color: #fff5fb;
          border-radius: 11px;
          padding: 13px 14px;
          font-size: 12px;
        }

        .molippy-customers .customer-sort option {
          background: #1b121d;
          color: #fff;
        }

        .molippy-customers .customer-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .molippy-customers .customer-table th {
          color: #9e8c9e;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          padding: 17px 18px;
          white-space: nowrap;
          background: #1b121d;
          border-bottom: 1px solid #382639;
        }

        .molippy-customers .customer-table td {
          padding: 18px;
          border-bottom: 1px solid #302130;
          color: #eee2ed;
          font-size: 12px;
          vertical-align: middle;
        }

        .molippy-customers .customer-table tr:last-child td {
          border-bottom: none;
        }

        .molippy-customers .profile-action:hover {
          background: #ff70ad !important;
          color: #190b14 !important;
        }

        @media (max-width: 700px) {
          .molippy-customers .customer-content {
            padding: 24px 15px 45px !important;
          }

          .molippy-customers .customer-heading {
            font-size: 35px !important;
          }

          .molippy-customers .customer-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .molippy-customers .customer-metrics > div {
            padding: 16px !important;
          }

          .molippy-customers .customer-metrics .metric-number {
            font-size: 24px !important;
          }

          .molippy-customers .customer-filters {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="customer-content" style={styles.content}>
        <header style={styles.header}>
          <div>
            <a href="/admin" style={styles.backLink}>
              <span style={{ fontSize: 17 }}>←</span> Dashboard
            </a>

            <div style={styles.eyebrow}>
              <span style={styles.eyebrowLine} />
              MOLIPPY PRODUCTS / COMMUNITY
            </div>

            <h1 className="customer-heading" style={styles.title}>
              Your <span style={{ color: "#f64e96" }}>People.</span>
            </h1>

            <p style={styles.subtitle}>
              Get to know the people behind every order. Build relationships,
              reward loyalty and grow your Molippy community.
            </p>
          </div>

          <button
            onClick={() => void loadCustomers()}
            disabled={loading}
            style={{
              ...styles.refreshButton,
              opacity: loading ? 0.65 : 1,
            }}
          >
            ↻ {loading ? "Refreshing..." : "Refresh customers"}
          </button>
        </header>

        {message && (
          <div style={styles.errorBox}>
            <div>
              <strong style={{ color: "#ff9ebf" }}>
                We couldn’t load your customers
              </strong>
              <p style={{ color: "#c9b5c4", fontSize: 12, marginBottom: 0 }}>
                {message}
              </p>
            </div>
            <button
              onClick={() => void loadCustomers()}
              style={styles.retryButton}
            >
              Try again
            </button>
          </div>
        )}

        {loading && customers.length === 0 && !message && (
          <div style={styles.loadingPanel}>
            <div style={styles.loadingMark}>M</div>
            <h2 style={{ color: "#fff5fb", fontSize: 19 }}>
              Gathering your community...
            </h2>
            <p style={{ color: "#9f8b9d", fontSize: 12 }}>
              Your customer list is on its way.
            </p>
          </div>
        )}

        {!loading && !message && (
          <>
            <section className="customer-metrics" style={styles.metricGrid}>
              <MetricCard
                label="Total customers"
                value={customers.length.toLocaleString("en-NG")}
                detail="Registered accounts"
                icon="♡"
              />
              <MetricCard
                label="Customers with orders"
                value={activeCustomers.toLocaleString("en-NG")}
                detail="Have placed at least one order"
                icon="✦"
                accent="#7ee5b0"
              />
              <MetricCard
                label="Orders placed"
                value={totalOrders.toLocaleString("en-NG")}
                detail="Across all listed customers"
                icon="▤"
                accent="#c5a0ff"
              />
              <MetricCard
                label="Total spent"
                value={money(totalRevenue)}
                detail="Combined customer spending"
                icon="₦"
                accent="#ffca73"
              />
            </section>

            <section style={styles.insightCard}>
              <div style={styles.insightIcon}>✧</div>
              <div style={{ flex: 1 }}>
                <div style={styles.insightEyebrow}>CUSTOMER INSIGHT</div>
                <h2 style={styles.insightTitle}>
                  Every Molippy girl matters.
                </h2>
                <p style={styles.insightText}>
                  {customers.length === 0
                    ? "Your community is just getting started. New customers will appear here when they create an account."
                    : `${activeCustomers} of ${customers.length} customers have placed orders. The average recorded spend across all registered customers is ${money(averageSpend)}.`}
                </p>
              </div>
              <div style={styles.insightMini}>
                <span style={{ color: "#ff91bd", fontSize: 22 }}>♡</span>
                <span style={styles.insightMiniLabel}>COMMUNITY FIRST</span>
              </div>
            </section>

            <section style={styles.customersPanel}>
              <div style={styles.panelHeading}>
                <div>
                  <div style={styles.sectionEyebrow}>CUSTOMER DIRECTORY</div>
                  <h2 style={styles.panelTitle}>All customers</h2>
                  <p style={styles.panelSubtitle}>
                    Search your customers and explore their profiles.
                  </p>
                </div>

                <span style={styles.customerCount}>
                  {filteredCustomers.length}{" "}
                  {filteredCustomers.length === 1 ? "CUSTOMER" : "CUSTOMERS"}
                </span>
              </div>

              <div className="customer-filters" style={styles.filters}>
                <input
                  className="customer-search"
                  type="search"
                  placeholder="Search by name, email or customer ID..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search customers"
                />

                <select
                  className="customer-sort"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort customers"
                >
                  <option value="newest">Newest customers</option>
                  <option value="oldest">Oldest customers</option>
                  <option value="highest-spend">Highest spending</option>
                  <option value="most-orders">Most orders</option>
                </select>
              </div>

              <div style={styles.resultsLine}>
                <span>
                  Showing{" "}
                  <strong style={{ color: "#f7eaf4" }}>
                    {filteredCustomers.length}
                  </strong>{" "}
                  of {customers.length} customers
                </span>

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={styles.clearButton}
                  >
                    Clear search ×
                  </button>
                )}
              </div>

              {filteredCustomers.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>♡</div>
                  <h3 style={{ color: "#fff1f8", margin: "12px 0 7px" }}>
                    {customers.length === 0
                      ? "Your community starts here"
                      : "No customers found"}
                  </h3>
                  <p
                    style={{
                      color: "#a38fa1",
                      fontSize: 12,
                      lineHeight: 1.7,
                      maxWidth: 350,
                      margin: "0 auto",
                    }}
                  >
                    {customers.length === 0
                      ? "Customers will appear here after they create an account."
                      : "Try a different name, email or customer ID."}
                  </p>
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={styles.emptyAction}
                    >
                      Show all customers
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: "auto", width: "100%" }}>
                  <table className="customer-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Orders</th>
                        <th>Paid orders</th>
                        <th>Total spent</th>
                        <th>Joined</th>
                        <th>Profile</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCustomers.map((customer) => {
                        const displayName =
                          customer.name?.trim() || "Unnamed customer";

                        const initials = displayName
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part.charAt(0))
                          .join("")
                          .toUpperCase();

                        return (
                          <tr key={customer.id} className="customer-row">
                            <td>
                              <div style={styles.customerCell}>
                                <div style={styles.avatar}>{initials || "M"}</div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={styles.customerName}>
                                    {displayName}
                                  </div>
                                  <div style={styles.customerEmail}>
                                    {customer.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span style={styles.orderPill}>
                                {customer.orderCount}
                              </span>
                            </td>

                            <td>
                              <span
                                style={{
                                  ...styles.paidValue,
                                  color:
                                    customer.paidOrderCount > 0
                                      ? "#82e5b2"
                                      : "#a28da0",
                                }}
                              >
                                {customer.paidOrderCount}
                              </span>
                            </td>

                            <td>
                              <span style={styles.amount}>
                                {money(customer.totalSpent)}
                              </span>
                            </td>

                            <td>
                              <span style={styles.joinedDate}>
                                {new Date(customer.createdAt).toLocaleDateString(
                                  "en-NG",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </td>

                            <td>
                              <a
                                href={`/admin/customers/${customer.id}`}
                                className="profile-action"
                                style={styles.viewButton}
                              >
                                View profile <span>↗</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <footer style={styles.panelFooter}>
                <span>MADE WITH ♡ FOR THE MOLIPPY GIRL</span>
                <span>YOUR CUSTOMERS, YOUR COMMUNITY</span>
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
    marginBottom: 32,
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
    fontSize: "clamp(35px, 4.5vw, 51px)",
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
    maxWidth: 580,
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
    cursor: "pointer",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  metricCard: {
    minWidth: 0,
    background: "linear-gradient(145deg, #211521, #181019)",
    border: "1px solid #352435",
    borderRadius: 18,
    padding: 23,
  },
  metricTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metricLabel: {
    color: "#b9aab9",
    fontSize: 12,
  },
  metricIcon: {
    display: "grid",
    placeItems: "center",
    width: 35,
    height: 35,
    borderRadius: 11,
    fontSize: 18,
    flexShrink: 0,
  },
  metricValue: {
    color: "#fff8fc",
    fontSize: "clamp(23px, 3vw, 33px)",
    fontWeight: 750,
    letterSpacing: -1,
    marginTop: 18,
    overflowWrap: "anywhere",
  },
  metricDetail: {
    color: "#8e7e8e",
    fontSize: 11,
    lineHeight: 1.6,
    margin: "9px 0 0",
  },
  insightCard: {
    display: "flex",
    alignItems: "center",
    gap: 17,
    marginTop: 23,
    padding: "22px 24px",
    border: "1px solid #573047",
    borderRadius: 17,
    background:
      "radial-gradient(ellipse at left, #382033 0%, #211520 55%, #1b121d 100%)",
  },
  insightIcon: {
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 15,
    background: "#49223a",
    border: "1px solid #70405c",
    color: "#ff92bd",
    fontSize: 26,
  },
  insightEyebrow: {
    color: "#ff8cba",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.8,
  },
  insightTitle: {
    color: "#fff2f9",
    fontSize: 17,
    margin: "7px 0 6px",
    letterSpacing: -0.3,
  },
  insightText: {
    color: "#b8a5b5",
    fontSize: 11,
    lineHeight: 1.8,
    margin: 0,
  },
  insightMini: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
    paddingLeft: 10,
    flexShrink: 0,
  },
  insightMiniLabel: {
    color: "#c9a5ba",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: 800,
  },
  customersPanel: {
    marginTop: 26,
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
  customerCount: {
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
  customerCell: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    minWidth: 215,
  },
  avatar: {
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: 37,
    height: 37,
    borderRadius: 12,
    color: "#ffb3d2",
    background: "linear-gradient(145deg, #49223a, #2b1728)",
    border: "1px solid #63324e",
    fontSize: 12,
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
  orderPill: {
    display: "inline-block",
    minWidth: 28,
    textAlign: "center",
    padding: "6px 9px",
    borderRadius: 7,
    background: "#2b1b2b",
    border: "1px solid #453047",
    color: "#e7b6d0",
    fontSize: 11,
    fontWeight: 700,
  },
  paidValue: {
    fontSize: 12,
    fontWeight: 750,
  },
  amount: {
    color: "#fff5fb",
    fontSize: 12,
    fontWeight: 750,
    whiteSpace: "nowrap",
  },
  joinedDate: {
    color: "#c1afbd",
    fontSize: 11,
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
