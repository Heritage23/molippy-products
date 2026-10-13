
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Order = {
  id: string | number;
  customer?: string;
  customerName?: string;
  user?: { name?: string; email?: string };
  email?: string;
  total?: number;
  totalAmount?: number;
  amount?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  items?: unknown[];
};

type Product = {
  id: string | number;
  name?: string;
  title?: string;
  stock?: number;
  quantity?: number;
  price?: number;
  images?: string[];
  image?: string;
  category?: { name?: string } | string;
};

type DashboardData = {
  orders: Order[];
  inventory: Product[];
  lowStockProducts: Product[];
  stats: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    totalSales: number;
  };
};

const initialData: DashboardData = {
  orders: [],
  inventory: [],
  lowStockProducts: [],
  stats: {
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    totalSales: 0,
  },
};

const navigation = [
  { label: "Overview", href: "/admin", icon: "grid" },
  { label: "Products", href: "/admin/products", icon: "box" },
  { label: "Orders", href: "/admin/orders", icon: "orders" },
  { label: "Inventory", href: "/admin/inventory", icon: "layers" },
  { label: "Customers", href: "/admin/customers", icon: "users" },
  { label: "Analytics", href: "/admin/analytics", icon: "chart" },
];

function Icon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 8 9 5 9-5" />
          <path d="M3 8v9l9 5 9-5V8" />
          <path d="M12 13v9" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 16 9 5 9-5" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 5a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 5.5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="m7 14 4-4 3 3 6-7" />
          <path d="M16 6h4v4" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M7 17 17 7M7 7h10v10" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5M12 17h.01" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0) / 100);
}

function formatDate(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function orderAmount(order: Order) {
  return Number(order.total ?? order.totalAmount ?? order.amount ?? 0);
}

function customerName(order: Order) {
  return (
    order.customerName ||
    order.customer ||
    order.user?.name ||
    order.user?.email ||
    order.email ||
    "Guest customer"
  );
}

function productName(product: Product) {
  return product.name || product.title || "Untitled product";
}

function productStock(product: Product) {
  return Number(product.stock ?? product.quantity ?? 0);
}

function orderStatus(order: Order) {
  return String(order.paymentStatus || order.status || "Pending");
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let styles = "border-[#66522b]/40 bg-[#493a21]/30 text-[#eac77f]";

  if (
    normalized.includes("paid") ||
    normalized.includes("complete") ||
    normalized.includes("deliver")
  ) {
    styles = "border-[#2b795d]/40 bg-[#174d3a]/35 text-[#83e0b4]";
  } else if (
    normalized.includes("cancel") ||
    normalized.includes("fail") ||
    normalized.includes("refund")
  ) {
    styles = "border-[#8c3654]/40 bg-[#65243a]/35 text-[#ff9db9]";
  } else if (
    normalized.includes("process") ||
    normalized.includes("ship")
  ) {
    styles = "border-[#7051a5]/40 bg-[#432b68]/35 text-[#c8b0ff]";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-medium capitalize ${styles}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#fa6ca6]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#fff2f7] sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-[#9e8794]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function OutlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-medium text-[#e5d1dc] transition hover:border-[#f64e96]/40 hover:bg-[#f64e96]/[0.07] hover:text-white"
    >
      {children}
    </Link>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? "You may not have permission to view the admin dashboard."
            : "We couldn't load your dashboard. Please try again."
        );
      }

      const result = await response.json();

      setData({
        orders: Array.isArray(result.orders) ? result.orders : [],
        inventory: Array.isArray(result.inventory)
          ? result.inventory
          : [],
        lowStockProducts: Array.isArray(result.lowStockProducts)
          ? result.lowStockProducts
          : [],
        stats: {
          totalOrders: Number(result.stats?.totalOrders ?? 0),
          paidOrders: Number(result.stats?.paidOrders ?? 0),
          pendingOrders: Number(result.stats?.pendingOrders ?? 0),
          totalSales: Number(result.stats?.totalSales ?? 0),
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const products = Array.isArray(data.inventory) ? data.inventory : [];

  const lowStockProducts = useMemo(() => {
    if (data.lowStockProducts.length > 0) {
      return data.lowStockProducts;
    }

    return products.filter((product) => productStock(product) <= 5);
  }, [data.lowStockProducts, products]);

  const recentOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = !query
      ? orders
      : orders.filter((order) => {
          const searchable = [
            String(order.id),
            customerName(order),
            order.user?.email,
            orderStatus(order),
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(query);
        });

    return [...filtered]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [orders, search]);

  const chart = useMemo(() => {
    const days: { label: string; date: string; amount: number }[] = [];

    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const amount = orders
        .filter((order) => {
          if (!order.createdAt) return false;
          const created = new Date(order.createdAt);
          return created >= day && created < nextDay;
        })
        .reduce((sum, order) => sum + orderAmount(order), 0);

      days.push({
        label: day.toLocaleDateString("en-NG", { weekday: "short" }),
        date: day.toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
        }),
        amount,
      });
    }

    const max = Math.max(...days.map((day) => day.amount), 1);
    const total = days.reduce((sum, day) => sum + day.amount, 0);

    return {
      days: days.map((day) => ({
        ...day,
        height: Math.max((day.amount / max) * 100, 3),
      })),
      max,
      total,
    };
  }, [orders]);

  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const pendingCount = data.stats.pendingOrders;
  const stockCount = lowStockProducts.length;

  return (
    <div className="min-h-screen bg-[#100b10] text-[#f9edf3] selection:bg-[#f64e96] selection:text-white">
      <style jsx global>{`
        .molippy-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .molippy-scrollbar::-webkit-scrollbar-track {
          background: #171017;
        }
        .molippy-scrollbar::-webkit-scrollbar-thumb {
          background: #503044;
          border-radius: 999px;
        }
        .molippy-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a33d70;
        }
      `}</style>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-white/[0.07] bg-[#171017] transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[84px] items-center justify-between border-b border-white/[0.07] px-6">
          <Link href="/admin" className="group">
            <span className="block text-[25px] font-black leading-none tracking-[0.12em] text-white">
              MOLI<span className="text-[#fa4f98]">PPY</span>
            </span>
            <span className="mt-2 block text-[9px] font-medium tracking-[0.43em] text-[#a48b9a]">
              BEAUTY, YOUR WAY
            </span>
          </Link>

          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#fa4f98]/30 bg-[#fa4f98]/10 text-sm text-[#ff7db4]">
            ✳
          </span>
        </div>

        <div className="px-4 pb-3 pt-6">
          <p className="px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-[#755e6c]">
            Manage your brand
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const active = item.href === "/admin";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 transition duration-200 ${
                  active
                    ? "bg-[#f64e96] text-white shadow-lg shadow-[#f64e96]/15"
                    : "text-[#a58f9c] hover:bg-white/[0.045] hover:text-white"
                }`}
              >
                <Icon name={item.icon} size={18} />
                <span className="text-[13px] font-medium">{item.label}</span>
                {active && (
                  <span className="ml-auto text-[10px] text-white/80">●</span>
                )}
                {!active && item.label === "Orders" && pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-[#3c2333] px-2 py-0.5 text-[10px] text-[#ff8ab9]">
                    {pendingCount}
                  </span>
                )}
                {!active && item.label === "Inventory" && stockCount > 0 && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[#f7b955]" />
                )}
              </Link>
            );
          })}

          <div className="!my-5 border-t border-white/[0.07]" />

          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[#a58f9c] transition hover:bg-white/[0.045] hover:text-white"
          >
            <Icon name="arrow" size={18} />
            <span className="text-[13px] font-medium">View storefront</span>
          </Link>
        </nav>

        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#f64e96]/20 bg-gradient-to-br from-[#35172b] to-[#22121e] p-4">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-[#fa4f98]/20" />
            <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full border border-[#fa4f98]/20" />
            <p className="relative text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff81b7]">
              The Molippy standard
            </p>
            <p className="relative mt-3 text-sm font-medium leading-6 text-[#f7eaf0]">
              Beauty meets confidence.
            </p>
            <p className="relative mt-1 text-xs leading-5 text-[#b59aaa]">
              Make every detail count.
            </p>
          </div>
          <p className="px-1 pb-1 pt-4 text-center text-[9px] tracking-wide text-[#6e5967]">
            MOLIPPY PRODUCTS · {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#100b10]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[#e8d8e1] lg:hidden"
            >
              ☰
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-[#8b7483]">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-[#d2b8c7]">Overview</span>
              </div>
              <h1 className="mt-1 truncate text-sm font-semibold tracking-wide text-white sm:text-base">
                Store dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] font-medium text-[#e5d4de]">{today}</p>
              <p className="mt-1 text-[10px] text-[#806a78]">
                Your business, at a glance
              </p>
            </div>

            <button
              type="button"
              aria-label="Refresh dashboard"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] text-[#cbb4c2] transition hover:border-[#f64e96]/40 hover:text-[#ff79b2] disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>
                <Icon name="refresh" size={17} />
              </span>
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff85b8] to-[#b72e6b] text-sm font-bold text-white shadow-lg shadow-[#f64e96]/10">
              M
            </div>
          </div>
        </header>

        <main className="molippy-scrollbar mx-auto max-w-[1700px] space-y-8 px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ff668f]/20 bg-[#ff668f]/[0.07] p-4">
              <div>
                <p className="text-sm font-semibold text-[#ff9eb8]">
                  Dashboard could not load
                </p>
                <p className="mt-1 text-xs text-[#c39eae]">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                className="rounded-lg bg-[#f64e96] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#ff6ca9]"
              >
                Try again
              </button>
            </div>
          )}

          <section className="relative overflow-hidden rounded-[26px] border border-[#f64e96]/20 bg-[#1b1019]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_25%,rgba(246,78,150,0.19),transparent_38%),radial-gradient(ellipse_at_10%_110%,rgba(115,35,77,0.24),transparent_45%)]" />
            <div className="absolute right-[-60px] top-[-100px] hidden h-[360px] w-[360px] rounded-full border border-[#f64e96]/10 md:block" />
            <div className="absolute right-[-15px] top-[-55px] hidden h-[270px] w-[270px] rounded-full border border-[#f64e96]/10 md:block" />
            <div className="absolute right-[48px] top-[36px] hidden h-[175px] w-[175px] rounded-full border border-[#f64e96]/10 md:block" />

            <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#f64e96]/25 bg-[#f64e96]/[0.08] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff65a6] shadow-[0_0_10px_rgba(255,101,166,0.8)]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.19em] text-[#ff8cba]">
                    The business of beauty
                  </span>
                </div>

                <h2 className="mt-6 text-[36px] font-semibold leading-[1.06] tracking-[-0.045em] text-white sm:text-5xl lg:text-[58px]">
                  Your brand.
                  <br />
                  <span className="font-serif font-normal italic text-[#ff68a8]">
                    Your moment.
                  </span>
                </h2>

                <p className="mt-5 max-w-md text-sm leading-6 text-[#b69eac] sm:text-[15px]">
                  Welcome to your command centre. Check your sales, stay ahead
                  of your orders, and keep your beauty business moving.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/admin/products/new"
                    className="inline-flex items-center gap-2.5 rounded-xl bg-[#f64e96] px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-[#f64e96]/15 transition hover:-translate-y-0.5 hover:bg-[#ff6ca9]"
                  >
                    <Icon name="plus" size={16} />
                    Add new product
                  </Link>
                  <Link
                    href="/admin/orders"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-xs font-semibold text-[#f1e3eb] transition hover:border-[#f64e96]/35 hover:bg-white/[0.06]"
                  >
                    Manage orders
                    <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:w-[270px] lg:grid-cols-1">
                <div className="rounded-2xl border border-white/[0.09] bg-black/20 p-4 backdrop-blur-md sm:p-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#a88c9c]">
                    Total orders
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {loading
                      ? "—"
                      : data.stats.totalOrders.toLocaleString("en-NG")}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-[#ff82b7]">
                    <span>✳</span>
                    <span>Orders across your store</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.09] bg-black/20 p-4 backdrop-blur-md sm:p-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#a88c9c]">
                    Products listed
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {loading ? "—" : products.length.toLocaleString("en-NG")}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-[#ff82b7]">
                    <span>✳</span>
                    <span>Your beauty collection</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="The numbers that matter"
              title="Store performance"
              description="A snapshot of how your business is doing."
            />

            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <div className="group relative overflow-hidden rounded-2xl border border-[#f64e96]/25 bg-gradient-to-br from-[#321526] to-[#20121c] p-5 sm:p-6">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#f64e96]/[0.08] blur-xl transition group-hover:bg-[#f64e96]/15" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#bd9bab]">
                      Total sales
                    </p>
                    <p className="mt-5 text-[27px] font-semibold tracking-[-0.04em] text-white sm:text-[32px]">
                      {loading ? "—" : formatMoney(data.stats.totalSales)}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f64e96]/20 bg-[#f64e96]/10 text-[#ff76af]">
                    <span className="text-lg font-medium">₦</span>
                  </div>
                </div>
                <div className="relative mt-5 border-t border-white/[0.07] pt-4">
                  <p className="text-[10px] text-[#9b8190]">
                    Total sales recorded by the store
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#191219] p-5 transition hover:border-white/[0.13] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#a991a0]">
                      Orders received
                    </p>
                    <p className="mt-5 text-[32px] font-semibold tracking-[-0.04em] text-white">
                      {loading ? "—" : data.stats.totalOrders.toLocaleString("en-NG")}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a78bfa]/10 text-[#c3afff]">
                    <Icon name="orders" size={19} />
                  </div>
                </div>
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <p className="text-[10px] text-[#8f7786]">
                    All orders in your store
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#191219] p-5 transition hover:border-white/[0.13] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#a991a0]">
                      Paid orders
                    </p>
                    <p className="mt-5 text-[32px] font-semibold tracking-[-0.04em] text-white">
                      {loading ? "—" : data.stats.paidOrders.toLocaleString("en-NG")}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#42c994]/10 text-[#72e0b2]">
                    <Icon name="check" size={19} />
                  </div>
                </div>
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <p className="text-[10px] text-[#8f7786]">
                    Orders marked as paid
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#191219] p-5 transition hover:border-white/[0.13] sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#a991a0]">
                      Awaiting action
                    </p>
                    <p className="mt-5 text-[32px] font-semibold tracking-[-0.04em] text-white">
                      {loading ? "—" : data.stats.pendingOrders.toLocaleString("en-NG")}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3bd5d]/10 text-[#f3c878]">
                    <Icon name="clock" size={19} />
                  </div>
                </div>
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <p className="text-[10px] text-[#8f7786]">
                    Orders needing follow-up
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 2xl:grid-cols-[1.4fr_0.85fr]">
            <div className="rounded-2xl border border-white/[0.07] bg-[#191219] p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#fa6ca6]">
                    Sales activity
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    The weekly picture
                  </h2>
                  <p className="mt-1.5 text-xs text-[#927b8a]">
                    Daily order totals for the last seven days
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                  <p className="text-[9px] uppercase tracking-[0.13em] text-[#907787]">
                    7-day total
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {loading ? "—" : formatMoney(chart.total)}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-7 gap-2 sm:gap-4">
                {chart.days.map((day, index) => (
                  <div key={`${day.label}-${index}`} className="min-w-0">
                    <div className="relative flex h-[155px] items-end justify-center overflow-hidden rounded-t-lg border-b border-white/[0.07] bg-[#120d12]">
                      <div
                        className={`w-[65%] rounded-t-md transition-all duration-500 ${
                          index === chart.days.length - 1
                            ? "bg-gradient-to-t from-[#bd2868] to-[#ff73b1] shadow-[0_0_22px_rgba(246,78,150,0.16)]"
                            : "bg-gradient-to-t from-[#4d233b] to-[#b6497b] hover:from-[#762e55] hover:to-[#f16da8]"
                        }`}
                        style={{ height: `${day.height}%` }}
                        title={`${day.date}: ${formatMoney(day.amount)}`}
                      />
                    </div>
                    <p className="mt-3 truncate text-center text-[10px] font-medium text-[#a68c9c]">
                      {day.label}
                    </p>
                    <p className="mt-1 text-center text-[9px] text-[#695365]">
                      {day.amount > 0 ? "₦" : "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#fa5b9f]" />
                  <span className="text-[10px] text-[#a58a9a]">
                    Order totals by day
                  </span>
                </div>
                <OutlineLink href="/admin/analytics">
                  Explore analytics <Icon name="arrow" size={13} />
                </OutlineLink>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#191219] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#fa6ca6]">
                    Product care
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Stock watch
                  </h2>
                  <p className="mt-1.5 text-xs leading-5 text-[#927b8a]">
                    Keep your customer favourites in stock.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0b957]/10 text-[#f0c16d]">
                  <Icon name="layers" size={19} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-[#120d12] p-4">
                  <p className="text-[10px] text-[#907787]">Products</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {loading ? "—" : products.length.toLocaleString("en-NG")}
                  </p>
                </div>
                <div className="rounded-xl border border-[#f0b957]/15 bg-[#f0b957]/[0.04] p-4">
                  <p className="text-[10px] text-[#b69b79]">Low stock</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f2c36f]">
                    {loading ? "—" : lowStockProducts.length.toLocaleString("en-NG")}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {loading ? (
                  <div className="py-8 text-center text-xs text-[#927b8a]">
                    Checking inventory…
                  </div>
                ) : lowStockProducts.length > 0 ? (
                  lowStockProducts.slice(0, 4).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.07] bg-[#2b1725]">
                        {product.images?.[0] || product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images?.[0] || product.image}
                            alt={productName(product)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg text-[#ff80b6]">✳</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[#f1e2eb]">
                          {productName(product)}
                        </p>
                        <p className="mt-1 text-[10px] text-[#8f7786]">
                          {productStock(product)} units remaining
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-semibold ${
                          productStock(product) <= 2
                            ? "bg-[#7a253e]/30 text-[#ff9db8]"
                            : "bg-[#6a4b20]/25 text-[#f2c36f]"
                        }`}
                      >
                        {productStock(product) <= 2 ? "Urgent" : "Restock"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                    <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#42c994]/10 text-[#72e0b2]">
                      <Icon name="check" size={17} />
                    </span>
                    <p className="mt-3 text-xs font-semibold text-[#e9dbe4]">
                      No low-stock alerts
                    </p>
                    <p className="mt-1 text-[10px] text-[#8f7786]">
                      Your stock watch is clear.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Link
                  href="/admin/inventory"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-medium text-[#dfc9d6] transition hover:border-[#f64e96]/40 hover:bg-[#f64e96]/[0.06] hover:text-white"
                >
                  Manage inventory <Icon name="arrow" size={13} />
                </Link>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#191219]">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#fa6ca6]">
                  The latest from your store
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Recent orders
                </h2>
                <p className="mt-1.5 text-xs text-[#927b8a]">
                  Your latest customer activity, all in one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.09] bg-[#120d12] px-3 py-2.5 sm:w-[220px]">
                  <Icon name="search" size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Find an order..."
                    aria-label="Search orders"
                    className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#705a69]"
                  />
                </label>
                <OutlineLink href="/admin/orders">
                  All orders <Icon name="arrow" size={13} />
                </OutlineLink>
              </div>
            </div>

            <div className="molippy-scrollbar overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                    {["Order", "Customer", "Date", "Amount", "Status"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-6 py-4 text-[9px] font-semibold uppercase tracking-[0.17em] text-[#806a79]"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.055]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-14 text-center text-xs text-[#927b8a]"
                      >
                        Loading your latest orders…
                      </td>
                    </tr>
                  ) : recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition hover:bg-white/[0.025]"
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-xs font-semibold text-[#ff80b6] transition hover:text-white"
                          >
                            #{String(order.id).slice(-8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f64e96]/15 bg-[#f64e96]/[0.09] text-[11px] font-semibold text-[#ff8abb]">
                              {customerName(order).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[190px] truncate text-xs font-medium text-[#f1e3eb]">
                                {customerName(order)}
                              </p>
                              {order.user?.email && order.user.name && (
                                <p className="mt-1 max-w-[190px] truncate text-[10px] text-[#806a79]">
                                  {order.user.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[11px] text-[#a58b9a]">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#f3e4ed]">
                          {formatMoney(orderAmount(order))}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={orderStatus(order)} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f64e96]/15 bg-[#f64e96]/[0.08] text-[#ff80b6]">
                          ♡
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[#f1e3eb]">
                          {search
                            ? "No matching orders"
                            : "Your first order starts here"}
                        </p>
                        <p className="mt-1 text-xs text-[#927b8a]">
                          {search
                            ? "Try a different name, order ID or status."
                            : "Customer orders will appear here when they come in."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-4 sm:px-7">
              <p className="text-[10px] text-[#806a79]">
                Showing {loading ? "—" : recentOrders.length} of{" "}
                {loading ? "—" : orders.length} orders
              </p>
              <Link
                href="/admin/orders"
                className="text-[10px] font-semibold text-[#ff80b6] transition hover:text-white"
              >
                Open order management →
              </Link>
            </div>
          </section>

          <footer className="flex flex-col gap-2 pb-4 pt-1 text-[10px] text-[#6e5967] sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Molippy Products.</p>
            <p>Beauty meets confidence. Made with care.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
