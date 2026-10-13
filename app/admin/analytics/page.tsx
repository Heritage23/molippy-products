"use client";

import { useEffect, useState } from "react";

type BestSellingProduct = {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
};

type RevenueByDate = {
  date: string;
  revenue: number;
  orders: number;
};

type AnalyticsData = {
  summary: {
    totalRevenue: number;
    paidOrders: number;
    pendingOrders: number;
    totalUnitsSold: number;
    averageOrderValue: number;
  };
  bestSellingProducts: BestSellingProduct[];
  revenueByDate: RevenueByDate[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAnalytics() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/analytics", {
        cache: "no-store",
      });

      const result = await response.json();

      console.log("Analytics API response:", result);

      if (!response.ok) {
        setMessage(
          result.message || "Unable to load analytics."
        );
        return;
      }

      setData(result);
    } catch (error) {
      console.error("Analytics page error:", error);
      setMessage("Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <main
        style={{
          maxWidth: "1200px",
          margin: "60px auto",
          padding: "20px",
        }}
      >
        <a
          href="/admin"
          style={{
            color: "#111",
            textDecoration: "none",
          }}
        >
          ← Back to Admin
        </a>

        <h1
          style={{
            fontSize: "36px",
            marginTop: "30px",
          }}
        >
          Analytics
        </h1>

        <p
          style={{
            marginTop: "15px",
            opacity: 0.7,
          }}
        >
          Loading analytics...
        </p>
      </main>
    );
  }

  if (message) {
    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "80px auto",
          padding: "20px",
        }}
      >
        <a
          href="/admin"
          style={{
            color: "#111",
            textDecoration: "none",
          }}
        >
          ← Back to Admin
        </a>

        <h1
          style={{
            fontSize: "36px",
            marginTop: "30px",
          }}
        >
          Analytics
        </h1>

        <p
          style={{
            marginTop: "15px",
            color: "#c00",
          }}
        >
          {message}
        </p>

        <button
          onClick={loadAnalytics}
          style={{
            marginTop: "20px",
            padding: "12px 18px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const {
    summary,
    bestSellingProducts,
    revenueByDate,
  } = data;

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "60px auto",
        padding: "20px",
      }}
    >
      <a
        href="/admin"
        style={{
          color: "#111",
          textDecoration: "none",
        }}
      >
        ← Back to Admin
      </a>

      <div
        style={{
          marginTop: "30px",
          marginBottom: "30px",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
          }}
        >
          Sales Analytics
        </h1>

        <p
          style={{
            marginTop: "8px",
            opacity: 0.7,
          }}
        >
          Understand Molippy sales, revenue and product performance.
        </p>
      </div>

      {/* Summary Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
        }}
      >
        <div style={statCardStyle}>
          <p style={statLabelStyle}>Total Revenue</p>

          <h2 style={statNumberStyle}>
            ₦
            {(summary.totalRevenue / 100).toLocaleString(
              "en-NG"
            )}
          </h2>
        </div>

        <div style={statCardStyle}>
          <p style={statLabelStyle}>Paid Orders</p>

          <h2 style={statNumberStyle}>
            {summary.paidOrders}
          </h2>
        </div>

        <div style={statCardStyle}>
          <p style={statLabelStyle}>Pending Orders</p>

          <h2
            style={{
              ...statNumberStyle,
              color:
                summary.pendingOrders > 0
                  ? "#8a5a00"
                  : "#147a3d",
            }}
          >
            {summary.pendingOrders}
          </h2>
        </div>

        <div style={statCardStyle}>
          <p style={statLabelStyle}>Units Sold</p>

          <h2 style={statNumberStyle}>
            {summary.totalUnitsSold}
          </h2>
        </div>

        <div style={statCardStyle}>
          <p style={statLabelStyle}>
            Average Order Value
          </p>

          <h2 style={statNumberStyle}>
            ₦
            {(summary.averageOrderValue / 100).toLocaleString(
              "en-NG"
            )}
          </h2>
        </div>
      </section>

      {/* Best Selling Products */}
      <section
        style={{
          marginTop: "50px",
        }}
      >
        <h2
          style={{
            fontSize: "28px",
            marginBottom: "8px",
          }}
        >
          Best-Selling Products
        </h2>

        <p
          style={{
            opacity: 0.7,
            marginBottom: "20px",
          }}
        >
          Products ranked by units sold.
        </p>

        {bestSellingProducts.length === 0 ? (
          <div style={emptyCardStyle}>
            <h3>No sales yet.</h3>

            <p
              style={{
                marginTop: "8px",
                opacity: 0.7,
              }}
            >
              Your best-selling products will appear here after
              customers make successful payments.
            </p>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #ddd",
              borderRadius: "14px",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "700px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Rank</th>
                  <th style={tableHeaderStyle}>Product</th>
                  <th style={tableHeaderStyle}>Units Sold</th>
                  <th style={tableHeaderStyle}>Revenue</th>
                </tr>
              </thead>

              <tbody>
                {bestSellingProducts.map(
                  (product, index) => (
                    <tr key={product.productId}>
                      <td style={tableCellStyle}>
                        <strong>
                          #{index + 1}
                        </strong>
                      </td>

                      <td style={tableCellStyle}>
                        {product.name}
                      </td>

                      <td
                        style={{
                          ...tableCellStyle,
                          fontWeight: "bold",
                        }}
                      >
                        {product.unitsSold}
                      </td>

                      <td style={tableCellStyle}>
                        ₦
                        {(
                          product.revenue / 100
                        ).toLocaleString("en-NG")}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Revenue History */}
      <section
        style={{
          marginTop: "50px",
        }}
      >
        <h2
          style={{
            fontSize: "28px",
            marginBottom: "8px",
          }}
        >
          Revenue History
        </h2>

        <p
          style={{
            opacity: 0.7,
            marginBottom: "20px",
          }}
        >
          Revenue generated from successful payments.
        </p>

        {revenueByDate.length === 0 ? (
          <div style={emptyCardStyle}>
            <h3>No revenue recorded yet.</h3>

            <p
              style={{
                marginTop: "8px",
                opacity: 0.7,
              }}
            >
              Revenue history will appear here after successful
              orders.
            </p>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #ddd",
              borderRadius: "14px",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "600px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>Orders</th>
                  <th style={tableHeaderStyle}>Revenue</th>
                </tr>
              </thead>

              <tbody>
                {revenueByDate.map((day) => (
                  <tr key={day.date}>
                    <td style={tableCellStyle}>
                      {new Date(
                        `${day.date}T00:00:00`
                      ).toLocaleDateString("en-NG")}
                    </td>

                    <td style={tableCellStyle}>
                      {day.orders}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        fontWeight: "bold",
                      }}
                    >
                      ₦
                      {(day.revenue / 100).toLocaleString(
                        "en-NG"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const statCardStyle = {
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "24px",
};

const statLabelStyle = {
  opacity: 0.6,
};

const statNumberStyle = {
  fontSize: "30px",
  marginTop: "8px",
};

const emptyCardStyle = {
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "30px",
};

const tableHeaderStyle = {
  textAlign: "left" as const,
  padding: "16px",
  borderBottom: "1px solid #ddd",
  fontSize: "14px",
};

const tableCellStyle = {
  padding: "16px",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
};