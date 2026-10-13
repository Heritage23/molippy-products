"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type InventoryItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  inventoryValue: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

type InventoryData = {
  inventory: InventoryItem[];
  stats: {
    totalProducts: number;
    totalUnits: number;
    totalInventoryValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
};

type StockFilter = "ALL" | InventoryItem["stockStatus"];

const formatMoney = (amount: number) =>
  `₦${(amount / 100).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;

function StockBadge({
  status,
}: {
  status: InventoryItem["stockStatus"];
}) {
  const config = {
    IN_STOCK: {
      label: "In stock",
      color: "#7ee5b0",
      background: "#153b2c",
      dot: "#7ee5b0",
    },
    LOW_STOCK: {
      label: "Low stock",
      color: "#ffd078",
      background: "#45351c",
      dot: "#ffd078",
    },
    OUT_OF_STOCK: {
      label: "Out of stock",
      color: "#ff91a9",
      background: "#47202c",
      dot: "#ff91a9",
    },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 10px",
        borderRadius: 30,
        background: config.background,
        color: config.color,
        fontSize: 10,
        fontWeight: 750,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: config.dot,
        }}
      />
      {config.label}
    </span>
  );
}

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

export default function InventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [adjustmentValues, setAdjustmentValues] = useState<
    Record<string, string>
  >({});
  const [adjustingProduct, setAdjustingProduct] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [sortBy, setSortBy] = useState("name");

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/inventory", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Unable to load inventory.");
        return;
      }

      setData(result);
    } catch (error) {
      console.error("Inventory page error:", error);
      setMessage("Unable to load inventory. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  async function adjustStock(productId: string) {
    const value = adjustmentValues[productId];

    if (!value || value.trim() === "") {
      setMessage("Enter a stock adjustment amount first.");
      return;
    }

    const adjustment = Number(value);

    if (!Number.isSafeInteger(adjustment)) {
      setMessage("Stock adjustment must be a whole number.");
      return;
    }

    if (adjustment === 0) {
      setMessage("Stock adjustment cannot be zero.");
      return;
    }

    const product = data?.inventory.find((item) => item.id === productId);

    if (product && product.stock + adjustment < 0) {
      setMessage(
        `You cannot remove ${Math.abs(adjustment)} units. ${product.name} currently has ${product.stock} units.`
      );
      return;
    }

    try {
      setAdjustingProduct(productId);
      setMessage("");

      const response = await fetch(`/api/admin/inventory/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adjustment }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Unable to update stock.");
        return;
      }

      setMessage(
        `${result.product.name} stock updated successfully.`
      );

      setAdjustmentValues((previous) => ({
        ...previous,
        [productId]: "",
      }));

      await loadInventory();
    } catch (error) {
      console.error("Stock adjustment error:", error);
      setMessage("Unable to update stock.");
    } finally {
      setAdjustingProduct(null);
    }
  }

  const inventory = data?.inventory ?? [];
  const stats = data?.stats;

  const filteredInventory = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = inventory.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term);

      const matchesStatus =
        stockFilter === "ALL" || product.stockStatus === stockFilter;

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "stock-low") return a.stock - b.stock;
      if (sortBy === "stock-high") return b.stock - a.stock;
      if (sortBy === "value-high") return b.inventoryValue - a.inventoryValue;
      if (sortBy === "price-high") return b.price - a.price;
      return a.name.localeCompare(b.name);
    });
  }, [inventory, search, stockFilter, sortBy]);

  const needsAttention =
    (stats?.lowStockProducts ?? 0) + (stats?.outOfStockProducts ?? 0);

  return (
    <main className="molippy-inventory" style={styles.page}>
      <style jsx global>{`
        .molippy-inventory * {
          box-sizing: border-box;
        }

        .molippy-inventory input,
        .molippy-inventory select,
        .molippy-inventory button {
          font: inherit;
        }

        .molippy-inventory input:focus,
        .molippy-inventory select:focus {
          outline: 1px solid #f64e96;
          border-color: #f64e96 !important;
        }

        .molippy-inventory .inventory-row {
          transition: background 160ms ease;
        }

        .molippy-inventory .inventory-row:hover {
          background: #251825;
        }

        .molippy-inventory .inventory-search,
        .molippy-inventory .inventory-sort,
        .molippy-inventory .adjustment-input {
          width: 100%;
          min-width: 0;
          background: #130d15;
          border: 1px solid #3a293b;
          border-radius: 10px;
          color: #fff5fb;
          padding: 11px 12px;
          font-size: 11px;
        }

        .molippy-inventory .inventory-sort option {
          background: #1b121d;
          color: #fff;
        }

        .molippy-inventory .inventory-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .molippy-inventory .inventory-table th {
          color: #9e8c9e;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
          padding: 16px;
          white-space: nowrap;
          background: #1b121d;
          border-bottom: 1px solid #382639;
        }

        .molippy-inventory .inventory-table td {
          padding: 16px;
          border-bottom: 1px solid #302130;
          color: #eee2ed;
          font-size: 11px;
          vertical-align: middle;
        }

        .molippy-inventory .inventory-table tr:last-child td {
          border-bottom: none;
        }

        .molippy-inventory .pink-button:hover {
          background: #ff70ad !important;
          color: #190b14 !important;
        }

        .molippy-inventory .outline-button:hover {
          border-color: #f64e96 !important;
          color: #ff8cba !important;
        }

        @media (max-width: 700px) {
          .molippy-inventory .inventory-content {
            padding: 24px 15px 45px !important;
          }

          .molippy-inventory .inventory-title {
            font-size: 35px !important;
          }

          .molippy-inventory .inventory-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .molippy-inventory .inventory-metrics > div {
            padding: 16px !important;
          }

          .molippy-inventory .inventory-metrics .metric-number {
            font-size: 23px !important;
          }

          .molippy-inventory .inventory-filters {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="inventory-content" style={styles.content}>
        <header style={styles.header}>
          <div>
            <a href="/admin" style={styles.backLink}>
              <span style={{ fontSize: 17 }}>←</span> Dashboard
            </a>

            <div style={styles.eyebrow}>
              <span style={styles.eyebrowLine} />
              MOLIPPY PRODUCTS / STOCKROOM
            </div>

            <h1 className="inventory-title" style={styles.title}>
              Stock <span style={{ color: "#f64e96" }}>Control.</span>
            </h1>

            <p style={styles.subtitle}>
              Keep your shelves ready for every Molippy girl. Monitor stock,
              track product value and make adjustments with confidence.
            </p>
          </div>

          <button
            onClick={() => void loadInventory()}
            disabled={loading}
            className="outline-button"
            style={{
              ...styles.refreshButton,
              opacity: loading ? 0.65 : 1,
            }}
          >
            ↻ {loading ? "Refreshing..." : "Refresh inventory"}
          </button>
        </header>

        {message && (
          <div
            role="status"
            style={{
              ...styles.messageBox,
              background: message.includes("successfully")
                ? "#153b2c"
                : "#28151e",
              borderColor: message.includes("successfully")
                ? "#28583e"
                : "#673044",
              color: message.includes("successfully")
                ? "#9bf0bf"
                : "#ffb1c5",
            }}
          >
            <span>{message.includes("successfully") ? "✓" : "!"}</span>
            <span style={{ flex: 1 }}>{message}</span>
            <button
              onClick={() => setMessage("")}
              style={styles.dismissButton}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {!data && loading && (
          <div style={styles.loadingPanel}>
            <div style={styles.loadingMark}>M</div>
            <h2 style={{ color: "#fff5fb", fontSize: 19 }}>
              Checking your stockroom...
            </h2>
            <p style={{ color: "#9f8b9d", fontSize: 12 }}>
              Getting your inventory ready.
            </p>
          </div>
        )}

        {!data && !loading && (
          <div style={styles.emptyState}>
            <h2 style={{ color: "#fff5fb" }}>Inventory unavailable</h2>
            <p style={{ color: "#a38fa1", fontSize: 12 }}>{message}</p>
            <button
              onClick={() => void loadInventory()}
              className="pink-button"
              style={styles.retryButton}
            >
              Try again
            </button>
          </div>
        )}

        {data && stats && (
          <>
            <section className="inventory-metrics" style={styles.metricGrid}>
              <MetricCard
                label="Total products"
                value={stats.totalProducts.toLocaleString("en-NG")}
                detail="Products in your catalogue"
                icon="✧"
              />
              <MetricCard
                label="Units in stock"
                value={stats.totalUnits.toLocaleString("en-NG")}
                detail="Across all products"
                icon="▤"
                accent="#c5a0ff"
              />
              <MetricCard
                label="Inventory value"
                value={formatMoney(stats.totalInventoryValue)}
                detail="Current stock value"
                icon="₦"
                accent="#7ee5b0"
              />
              <MetricCard
                label="Needs attention"
                value={needsAttention.toLocaleString("en-NG")}
                detail={`${stats.lowStockProducts} low stock · ${stats.outOfStockProducts} out of stock`}
                icon="!"
                accent={needsAttention > 0 ? "#ffca73" : "#7ee5b0"}
              />
            </section>

            <section style={styles.alertCard}>
              <div style={styles.alertIcon}>!</div>
              <div style={{ flex: 1 }}>
                <div style={styles.alertEyebrow}>STOCK HEALTH</div>
                <h2 style={styles.alertTitle}>
                  {stats.outOfStockProducts > 0
                    ? `${stats.outOfStockProducts} product${stats.outOfStockProducts === 1 ? "" : "s"} out of stock`
                    : stats.lowStockProducts > 0
                      ? "Your low-stock products need attention"
                      : "Your stockroom is looking good"}
                </h2>
                <p style={styles.alertText}>
                  {stats.outOfStockProducts > 0
                    ? "Review unavailable products and replenish stock to help customers shop without interruption."
                    : stats.lowStockProducts > 0
                      ? "Consider replenishing low-stock products before demand increases."
                      : "No products are currently flagged as low or out of stock."}
                </p>
              </div>
              {needsAttention > 0 && (
                <button
                  onClick={() => setStockFilter("OUT_OF_STOCK")}
                  className="outline-button"
                  style={styles.alertAction}
                >
                  Review stock ↗
                </button>
              )}
            </section>

            <section style={styles.productsPanel}>
              <div style={styles.panelHeading}>
                <div>
                  <div style={styles.sectionEyebrow}>PRODUCT DIRECTORY</div>
                  <h2 style={styles.panelTitle}>Your products</h2>
                  <p style={styles.panelSubtitle}>
                    Update quantities and keep track of every item.
                  </p>
                </div>

                <span style={styles.productCount}>
                  {filteredInventory.length}{" "}
                  {filteredInventory.length === 1 ? "PRODUCT" : "PRODUCTS"}
                </span>
              </div>

              <div className="inventory-filters" style={styles.filters}>
                <input
                  className="inventory-search"
                  type="search"
                  placeholder="Search products or categories..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search products"
                />

                <select
                  className="inventory-sort"
                  value={stockFilter}
                  onChange={(event) =>
                    setStockFilter(event.target.value as StockFilter)
                  }
                  aria-label="Filter stock status"
                >
                  <option value="ALL">All stock statuses</option>
                  <option value="IN_STOCK">In stock</option>
                  <option value="LOW_STOCK">Low stock</option>
                  <option value="OUT_OF_STOCK">Out of stock</option>
                </select>

                <select
                  className="inventory-sort"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort products"
                >
                  <option value="name">Product name A–Z</option>
                  <option value="stock-low">Lowest stock first</option>
                  <option value="stock-high">Highest stock first</option>
                  <option value="value-high">Highest inventory value</option>
                  <option value="price-high">Highest price first</option>
                </select>
              </div>

              <div style={styles.resultsLine}>
                <span>
                  Showing{" "}
                  <strong style={{ color: "#f7eaf4" }}>
                    {filteredInventory.length}
                  </strong>{" "}
                  of {inventory.length} products
                </span>

                {(search || stockFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setStockFilter("ALL");
                    }}
                    style={styles.clearButton}
                  >
                    Clear filters ×
                  </button>
                )}
              </div>

              {filteredInventory.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>♡</div>
                  <h3 style={{ color: "#fff1f8", margin: "12px 0 7px" }}>
                    {inventory.length === 0
                      ? "Your product shelf is empty"
                      : "No matching products"}
                  </h3>
                  <p style={styles.emptyText}>
                    {inventory.length === 0
                      ? "Products will appear here when they are available in your catalogue."
                      : "Try another search or clear your filters."}
                  </p>
                  {(search || stockFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setStockFilter("ALL");
                      }}
                      className="pink-button"
                      style={styles.retryButton}
                    >
                      Show all products
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: "auto", width: "100%" }}>
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Unit price</th>
                        <th>Quantity</th>
                        <th>Stock value</th>
                        <th>Status</th>
                        <th>Adjust stock</th>
                        <th>Product</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredInventory.map((product) => (
                        <tr key={product.id} className="inventory-row">
                          <td>
                            <div style={styles.productCell}>
                              <div style={styles.productIcon}>M</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={styles.productName}>
                                  {product.name}
                                </div>
                                <div style={styles.productSlug}>
                                  {product.slug}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span style={styles.categoryPill}>
                              {product.category || "Uncategorised"}
                            </span>
                          </td>

                          <td>
                            <span style={styles.price}>
                              {formatMoney(product.price)}
                            </span>
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.quantity,
                                color:
                                  product.stockStatus === "OUT_OF_STOCK"
                                    ? "#ff91a9"
                                    : product.stockStatus === "LOW_STOCK"
                                      ? "#ffd078"
                                      : "#fff5fb",
                              }}
                            >
                              {product.stock}
                            </span>
                            <span style={styles.unitsLabel}> units</span>
                          </td>

                          <td>
                            <span style={styles.price}>
                              {formatMoney(product.inventoryValue)}
                            </span>
                          </td>

                          <td>
                            <StockBadge status={product.stockStatus} />
                          </td>

                          <td>
                            <div style={styles.adjustmentGroup}>
                              <input
                                className="adjustment-input"
                                type="number"
                                step="1"
                                placeholder="+10 / -2"
                                value={adjustmentValues[product.id] ?? ""}
                                onChange={(event) => {
                                  setAdjustmentValues((previous) => ({
                                    ...previous,
                                    [product.id]: event.target.value,
                                  }));
                                }}
                                aria-label={`Stock adjustment for ${product.name}`}
                                disabled={adjustingProduct === product.id}
                                style={{ width: 95 }}
                              />

                              <button
                                onClick={() => void adjustStock(product.id)}
                                disabled={adjustingProduct === product.id}
                                className="pink-button"
                                style={{
                                  ...styles.updateButton,
                                  opacity:
                                    adjustingProduct === product.id ? 0.65 : 1,
                                  cursor:
                                    adjustingProduct === product.id
                                      ? "wait"
                                      : "pointer",
                                }}
                              >
                                {adjustingProduct === product.id
                                  ? "..."
                                  : "Update"}
                              </button>
                            </div>
                          </td>

                          <td>
                            <a
                              href={`/admin/products/${product.id}/edit`}
                              className="outline-button"
                              style={styles.editButton}
                            >
                              Edit ↗
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
                <span>PRODUCTS & STOCK CONTROL</span>
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
    maxWidth: 1600,
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
    maxWidth: 600,
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
  alertCard: {
    display: "flex",
    alignItems: "center",
    gap: 17,
    flexWrap: "wrap",
    marginTop: 23,
    padding: "22px 24px",
    border: "1px solid #573047",
    borderRadius: 17,
    background:
      "radial-gradient(ellipse at left, #382033 0%, #211520 55%, #1b121d 100%)",
  },
  alertIcon: {
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: 45,
    height: 45,
    borderRadius: 14,
    background: "#49223a",
    border: "1px solid #70405c",
    color: "#ff92bd",
    fontSize: 23,
    fontWeight: 800,
  },
  alertEyebrow: {
    color: "#ff8cba",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.8,
  },
  alertTitle: {
    color: "#fff2f9",
    fontSize: 16,
    margin: "7px 0 6px",
  },
  alertText: {
    color: "#b8a5b5",
    fontSize: 11,
    lineHeight: 1.8,
    margin: 0,
  },
  alertAction: {
    border: "1px solid #70405c",
    background: "#321a2a",
    color: "#ff91bd",
    padding: "10px 13px",
    borderRadius: 9,
    fontSize: 10,
    fontWeight: 750,
    cursor: "pointer",
  },
  productsPanel: {
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
  productCount: {
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
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(170px, 210px) minmax(170px, 210px)",
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
  productCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 180,
  },
  productIcon: {
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: 35,
    height: 35,
    borderRadius: 11,
    color: "#ffb3d2",
    background: "linear-gradient(145deg, #49223a, #2b1728)",
    border: "1px solid #63324e",
    fontSize: 13,
    fontWeight: 900,
  },
  productName: {
    color: "#fff0f8",
    fontSize: 11,
    fontWeight: 750,
    marginBottom: 5,
  },
  productSlug: {
    color: "#9f8a9d",
    fontSize: 9,
    overflowWrap: "anywhere",
  },
  categoryPill: {
    display: "inline-block",
    maxWidth: 130,
    padding: "6px 8px",
    borderRadius: 7,
    background: "#2b1b2b",
    border: "1px solid #453047",
    color: "#d8b6cf",
    fontSize: 10,
  },
  price: {
    color: "#fff5fb",
    fontSize: 11,
    fontWeight: 750,
    whiteSpace: "nowrap",
  },
  quantity: {
    fontSize: 13,
    fontWeight: 800,
  },
  unitsLabel: {
    color: "#8e7e8e",
    fontSize: 9,
  },
  adjustmentGroup: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minWidth: 170,
  },
  updateButton: {
    flexShrink: 0,
    border: 0,
    borderRadius: 8,
    padding: "10px 11px",
    background: "#f64e96",
    color: "#1a0c15",
    fontSize: 10,
    fontWeight: 800,
  },
  editButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    color: "#ff91bd",
    border: "1px solid #65314e",
    background: "#321a2a",
    borderRadius: 8,
    textDecoration: "none",
    padding: "9px 11px",
    fontSize: 10,
    fontWeight: 700,
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
  emptyText: {
    color: "#a38fa1",
    fontSize: 12,
    lineHeight: 1.7,
    maxWidth: 350,
    margin: "0 auto",
  },
  retryButton: {
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
  messageBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 17px",
    marginBottom: 22,
    borderRadius: 11,
    border: "1px solid",
    fontSize: 12,
    lineHeight: 1.6,
  },
  dismissButton: {
    background: "transparent",
    border: 0,
    color: "inherit",
    cursor: "pointer",
    fontSize: 20,
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
