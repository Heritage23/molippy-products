"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Product = {
  id: string;
  name: string;
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
  items: OrderItem[];
};

type Customer = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

type CustomerData = {
  customer: Customer;
  stats: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    totalSpent: number;
  };
  orders: Order[];
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCustomer() {
      try {
        const response = await fetch(
          `/api/admin/customers/${customerId}`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          setMessage(
            result.message || "Unable to load customer."
          );
          return;
        }

        setData(result);
      } catch (error) {
        console.error(error);
        setMessage("Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <main
        style={{
          maxWidth: "1200px",
          margin: "60px auto",
          padding: "20px",
        }}
      >
        <h1>Customer</h1>

        <p
          style={{
            marginTop: "15px",
            opacity: 0.7,
          }}
        >
          Loading customer...
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
          href="/admin/customers"
          style={{
            color: "#111",
            textDecoration: "none",
          }}
        >
          ← Back to Customers
        </a>

        <h1
          style={{
            marginTop: "30px",
            fontSize: "32px",
          }}
        >
          Customer
        </h1>

        <p
          style={{
            marginTop: "15px",
            color: "#c00",
          }}
        >
          {message}
        </p>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const { customer, stats, orders } = data;

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "60px auto",
        padding: "20px",
      }}
    >
      {/* Back */}
      <a
        href="/admin/customers"
        style={{
          color: "#111",
          textDecoration: "none",
        }}
      >
        ← Back to Customers
      </a>

      {/* Customer Header */}
      <section
        style={{
          marginTop: "30px",
          border: "1px solid #ddd",
          borderRadius: "14px",
          padding: "30px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "14px",
                opacity: 0.6,
                marginBottom: "8px",
              }}
            >
              Customer Profile
            </p>

            <h1
              style={{
                fontSize: "36px",
              }}
            >
              {customer.name || "Unnamed Customer"}
            </h1>

            <p
              style={{
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              {customer.email}
            </p>

            <p
              style={{
                marginTop: "8px",
                opacity: 0.6,
                fontSize: "14px",
              }}
            >
              Joined{" "}
              {new Date(
                customer.createdAt
              ).toLocaleDateString("en-NG")}
            </p>
          </div>

          <div
            style={{
              padding: "12px 16px",
              background: "#f5f5f5",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#555",
            }}
          >
            Customer ID: {customer.id}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        <div style={statCardStyle}>
          <p style={statLabelStyle}>Total Orders</p>

          <h2 style={statNumberStyle}>
            {stats.totalOrders}
          </h2>
        </div>

        <div style={statCardStyle}>
          <p style={statLabelStyle}>Paid Orders</p>

          <h2 style={statNumberStyle}>
            {stats.paidOrders}
          </h2>
        </div>

        <div style={statCardStyle}>
          <p style={statLabelStyle}>Pending Orders</p>

          <h2 style={statNumberStyle}>
            {stats.pendingOrders}
          </h2>
        </div>

        <div style={statCardStyle}>
          <p style={statLabelStyle}>Total Spent</p>

          <h2 style={statNumberStyle}>
            ₦
            {(stats.totalSpent / 100).toLocaleString(
              "en-NG"
            )}
          </h2>
        </div>
      </section>

      {/* Order History */}
      <section
        style={{
          marginTop: "50px",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "28px",
            }}
          >
            Order History
          </h2>

          <p
            style={{
              marginTop: "6px",
              opacity: 0.7,
            }}
          >
            All orders placed by this customer.
          </p>
        </div>

        {orders.length === 0 ? (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "14px",
              padding: "30px",
            }}
          >
            <h3>No orders yet.</h3>

            <p
              style={{
                marginTop: "8px",
                opacity: 0.7,
              }}
            >
              This customer has not placed any orders.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            {orders.map((order) => (
              <article
                key={order.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "14px",
                  padding: "24px",
                }}
              >
                {/* Order Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    flexWrap: "wrap",
                    paddingBottom: "18px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "13px",
                        opacity: 0.6,
                      }}
                    >
                      Order ID
                    </p>

                    <a
                      href={`/admin/orders/${order.id}`}
                      style={{
                        display: "inline-block",
                        marginTop: "5px",
                        color: "#111",
                        fontWeight: "bold",
                        textDecoration: "underline",
                      }}
                    >
                      {order.id}
                    </a>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "7px 12px",
                      borderRadius: "20px",
                      background:
                        order.status === "PAID" ||
                        order.status === "DELIVERED"
                          ? "#e8f7ee"
                          : order.status === "CANCELLED"
                            ? "#fdeaea"
                            : "#fff4d6",
                      color:
                        order.status === "PAID" ||
                        order.status === "DELIVERED"
                          ? "#147a3d"
                          : order.status === "CANCELLED"
                            ? "#b00020"
                            : "#8a5a00",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Order Info */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "20px",
                    marginTop: "20px",
                  }}
                >
                  <div>
                    <p style={infoLabelStyle}>Order Date</p>

                    <p style={infoValueStyle}>
                      {new Date(
                        order.createdAt
                      ).toLocaleDateString("en-NG")}
                    </p>
                  </div>

                  <div>
                    <p style={infoLabelStyle}>Order Total</p>

                    <p
                      style={{
                        ...infoValueStyle,
                        fontWeight: "bold",
                      }}
                    >
                      ₦
                      {(order.total).toLocaleString(
                        "en-NG"
                      )}
                    </p>
                  </div>

                  <div>
                    <p style={infoLabelStyle}>
                      Payment Reference
                    </p>

                    <p style={infoValueStyle}>
                      {order.paymentReference ||
                        "No payment reference"}
                    </p>
                  </div>
                </div>

                {/* Shipping Information */}
                {(order.shippingName ||
                  order.shippingPhone ||
                  order.shippingAddress) && (
                  <div
                    style={{
                      marginTop: "24px",
                      padding: "18px",
                      background: "#f8f8f8",
                      borderRadius: "10px",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "16px",
                        marginBottom: "12px",
                      }}
                    >
                      Shipping Information
                    </h3>

                    <p style={shippingTextStyle}>
                      <strong>Name:</strong>{" "}
                      {order.shippingName ||
                        "Not provided"}
                    </p>

                    <p style={shippingTextStyle}>
                      <strong>Email:</strong>{" "}
                      {order.shippingEmail ||
                        "Not provided"}
                    </p>

                    <p style={shippingTextStyle}>
                      <strong>Phone:</strong>{" "}
                      {order.shippingPhone ||
                        "Not provided"}
                    </p>

                    <p style={shippingTextStyle}>
                      <strong>Address:</strong>{" "}
                      {order.shippingAddress ||
                        "Not provided"}
                    </p>
                  </div>
                )}

                {/* Products */}
                <div
                  style={{
                    marginTop: "24px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      marginBottom: "12px",
                    }}
                  >
                    Products
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: "15px",
                          padding: "14px",
                          border: "1px solid #eee",
                          borderRadius: "8px",
                        }}
                      >
                        <div>
                          <strong>
                            {item.product.name}
                          </strong>

                          <p
                            style={{
                              marginTop: "5px",
                              fontSize: "13px",
                              opacity: 0.6,
                            }}
                          >
                            Quantity: {item.quantity}
                          </p>
                        </div>

                        <strong>
                          ₦
                          {(
                            (item.price *
                              item.quantity) /
                            100
                          ).toLocaleString("en-NG")}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
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

const infoLabelStyle = {
  fontSize: "13px",
  opacity: 0.6,
};

const infoValueStyle = {
  marginTop: "6px",
  fontSize: "14px",
};

const shippingTextStyle = {
  marginTop: "7px",
  fontSize: "14px",
};