"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  category: {
    name: string;
  };
};

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

const productLabels = [
  "The everyday essential",
  "The glossy one",
  "The prep step",
  "The soft girl essential",
];

const productEmojis = ["💗", "✨", "🍓", "🤍"];

export default function Home() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok) {
          setProducts(data.slice(0, 4));
        }
      } catch (error) {
        console.error("Unable to load products:", error);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok && data.loggedIn && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Unable to check authentication:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        setUser(null);
        setMenuOpen(false);
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8fb] text-[#24131c]">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-12px) rotate(2deg);
          }
        }

        @keyframes floatReverse {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(10px) rotate(-3deg);
          }
        }

        @keyframes marquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @keyframes pulseSoft {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.05);
          }
        }

        .molippy-float {
          animation: float 5s ease-in-out infinite;
        }

        .molippy-float-reverse {
          animation: floatReverse 6s ease-in-out infinite;
        }

        .molippy-marquee {
          animation: marquee 25s linear infinite;
        }

        .molippy-pulse {
          animation: pulseSoft 4s ease-in-out infinite;
        }

        @media (max-width: 640px) {
          .molippy-float,
          .molippy-float-reverse {
            animation: none;
          }

          .molippy-marquee {
            animation-duration: 20s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          .molippy-float,
          .molippy-float-reverse,
          .molippy-marquee,
          .molippy-pulse {
            animation: none;
          }
        }
      `}</style>

      {/* ANNOUNCEMENT */}
      <div className="bg-[#f51b78] px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-[0.18em] text-white sm:text-xs sm:tracking-[0.22em]">
        Welcome to your soft lip era ♡
      </div>

      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 border-b border-[#f2d9e4]/80 bg-[#fff8fb]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-8 sm:py-4">
          {/* LOGO */}
          <a href="/" className="group shrink-0">
            <div className="flex flex-col leading-none transition group-hover:scale-105">
              <span className="text-[20px] font-black tracking-[-0.055em] text-[#f51b78] sm:text-[25px]">
                MOLIPPY
              </span>

              <span className="mt-0.5 text-[7px] font-black uppercase tracking-[0.28em] text-[#74113f] sm:text-[9px] sm:tracking-[0.32em]">
                PRODUCTS
              </span>
            </div>
          </a>

          {/* DESKTOP NAV */}
          <div className="hidden items-center gap-6 text-sm font-bold md:flex">
            <a
              href="/"
              className="transition hover:text-[#f51b78]"
            >
              Home
            </a>

            <a
              href="/products"
              className="transition hover:text-[#f51b78]"
            >
              Shop
            </a>

            <a
              href="#molippy-girl"
              className="transition hover:text-[#f51b78]"
            >
              Molippy Girl
            </a>

            <a
              href="#story"
              className="transition hover:text-[#f51b78]"
            >
              Our Story
            </a>

            {!authLoading && !user && (
              <>
                <a
                  href="/login"
                  className="transition hover:text-[#f51b78]"
                >
                  Login
                </a>

                <a
                  href="/signup"
                  className="transition hover:text-[#f51b78]"
                >
                  Create Account
                </a>
              </>
            )}

            {!authLoading && user && (
              <>
                <span className="max-w-[130px] truncate text-[#8d174d]">
                  Hi, {user.name || "there"} ♡
                </span>

                {user.role === "ADMIN" ? (
                  <a
                    href="/admin"
                    className="rounded-full border border-[#f3cfde] bg-white px-4 py-2 text-xs font-black text-[#74113f] transition hover:border-[#f51b78] hover:bg-[#fff0f6] hover:text-[#f51b78]"
                  >
                    👑 Admin Dashboard
                  </a>
                ) : (
                  <a
                    href="/account"
                    className="transition hover:text-[#f51b78]"
                  >
                    Account
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="transition hover:text-[#f51b78] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            )}

            <a
              href="/cart"
              className="rounded-full bg-[#f51b78] px-5 py-2.5 text-white shadow-[0_8px_25px_rgba(245,27,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#df0d66]"
            >
              Cart ♡
            </a>
          </div>

          {/* MOBILE ACTIONS */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href="/cart"
              className="flex min-h-10 items-center rounded-full bg-[#f51b78] px-4 py-2 text-[11px] font-black text-white shadow-sm"
            >
              Cart ♡
            </a>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f2d9e4] bg-white text-[#74113f] active:scale-95"
            >
              <span className="flex flex-col gap-1.5">
                <span
                  className={`block h-0.5 w-5 bg-[#74113f] transition ${menuOpen ? "translate-y-2 rotate-45" : ""
                    }`}
                />

                <span
                  className={`block h-0.5 w-5 bg-[#74113f] transition ${menuOpen ? "opacity-0" : ""
                    }`}
                />

                <span
                  className={`block h-0.5 w-5 bg-[#74113f] transition ${menuOpen ? "-translate-y-2 -rotate-45" : ""
                    }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="border-t border-[#f2d9e4] bg-white px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <a
                href="/"
                onClick={closeMenu}
                className="min-h-11 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-[#fff0f6] hover:text-[#f51b78]"
              >
                Home
              </a>

              <a
                href="/products"
                onClick={closeMenu}
                className="min-h-11 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-[#fff0f6] hover:text-[#f51b78]"
              >
                Shop
              </a>

              <a
                href="#molippy-girl"
                onClick={closeMenu}
                className="min-h-11 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-[#fff0f6] hover:text-[#f51b78]"
              >
                Molippy Girl
              </a>

              <a
                href="#story"
                onClick={closeMenu}
                className="min-h-11 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-[#fff0f6] hover:text-[#f51b78]"
              >
                Our Story
              </a>

              {!authLoading && !user && (
                <>
                  <a
                    href="/login"
                    onClick={closeMenu}
                    className="min-h-11 rounded-2xl bg-[#fff0f6] px-4 py-3 text-sm font-black text-[#f51b78]"
                  >
                    Login
                  </a>

                  <a
                    href="/signup"
                    onClick={closeMenu}
                    className="min-h-11 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-[#fff0f6] hover:text-[#f51b78]"
                  >
                    Create Account
                  </a>
                </>
              )}

              {!authLoading && user && (
                <>
                  <div className="mx-2 my-2 rounded-2xl bg-[#fff0f6] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#f51b78]">
                      Welcome back
                    </p>

                    <p className="mt-1 text-sm font-black text-[#74113f]">
                      {user.name || "Molippy Girl"} ♡
                    </p>
                  </div>

                  {user.role === "ADMIN" ? (
                    <a
                      href="/admin"
                      onClick={closeMenu}
                      className="min-h-11 rounded-2xl bg-[#74113f] px-4 py-3 text-sm font-black text-white"
                    >
                      👑 Admin Dashboard
                    </a>
                  ) : (
                    <a
                      href="/account"
                      onClick={closeMenu}
                      className="min-h-11 rounded-2xl px-4 py-3 text-sm font-bold transition hover:bg-[#fff0f6] hover:text-[#f51b78]"
                    >
                      Account
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="min-h-11 rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#f51b78] transition hover:bg-[#fff0f6] disabled:opacity-50"
                  >
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </>
              )}

              {!authLoading && (
                <a
                  href="/cart"
                  onClick={closeMenu}
                  className="mt-2 min-h-11 rounded-2xl bg-[#f51b78] px-4 py-3 text-center text-sm font-black text-white"
                >
                  Go to Cart ♡
                </a>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative px-4 pb-14 pt-7 sm:px-8 sm:pb-20 sm:pt-12 lg:pb-24">
        <div className="pointer-events-none absolute -left-40 top-20 h-80 w-80 rounded-full bg-[#ffd0e2] blur-3xl sm:h-96 sm:w-96" />

        <div className="pointer-events-none absolute -right-40 top-0 h-80 w-80 rounded-full bg-[#ffb4d3] blur-3xl sm:h-96 sm:w-96" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 sm:gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          {/* HERO TEXT */}
          <div className="relative z-20 pt-2 lg:pt-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f7bfd6] bg-white px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#d91564] shadow-sm sm:mb-6 sm:px-4 sm:text-[10px] sm:tracking-[0.2em]">
              <span className="h-2 w-2 rounded-full bg-[#f51b78]" />
              Lip care by Molippy Products
            </div>

            <h1 className="max-w-3xl text-[49px] font-black leading-[0.86] tracking-[-0.075em] sm:text-7xl lg:text-[94px]">
              Your
              <span className="block text-[#f51b78]">
                soft lip
              </span>
              era
              <span className="block italic text-[#75113f]">
                starts here.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-6 text-[#765963] sm:mt-7 sm:text-lg sm:leading-7">
              Lip care made for girls who love soft lips, glossy moments,
              pretty things and feeling good in their own skin.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <a
                href="/products"
                className="flex min-h-12 items-center justify-center rounded-full bg-[#f51b78] px-7 py-3.5 text-sm font-black text-white shadow-[0_16px_40px_rgba(245,27,120,0.28)] transition duration-300 hover:-translate-y-1 hover:bg-[#df0d66] active:scale-[0.98] sm:px-8 sm:py-4"
              >
                Shop the lip edit ✦
              </a>

              <a
                href="#molippy-girl"
                className="flex min-h-12 items-center justify-center rounded-full border-2 border-[#f5c3d7] bg-white px-7 py-3.5 text-sm font-black text-[#8d174d] transition hover:border-[#f51b78] active:scale-[0.98] sm:px-8"
              >
                Meet the Molippy girl
              </a>
            </div>

            <div className="mt-8 flex items-center gap-3 sm:mt-9 sm:gap-4">
              <div className="flex -space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#ffb3d1] text-sm sm:h-9 sm:w-9">
                  💋
                </span>

                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#f51b78] text-sm sm:h-9 sm:w-9">
                  ✨
                </span>

                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#73113f] text-sm text-white sm:h-9 sm:w-9">
                  ♡
                </span>
              </div>

              <p className="max-w-[250px] text-[11px] font-bold leading-4 text-[#80606d] sm:text-xs">
                Soft lips. Big confidence. Main character energy.
              </p>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative min-h-[390px] sm:min-h-[620px]">
            <div className="absolute inset-2 overflow-hidden rounded-[34px] bg-[#f51b78] shadow-[0_30px_70px_rgba(245,27,120,0.23)] sm:inset-8 sm:rounded-[48px] sm:shadow-[0_35px_90px_rgba(245,27,120,0.25)]">
              <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full border-[35px] border-white/10 sm:-right-20 sm:h-72 sm:w-72 sm:border-[45px]" />

              <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full border-[40px] border-white/10 sm:h-80 sm:w-80 sm:border-[50px]" />

              <div className="absolute left-5 top-5 sm:left-7 sm:top-7">
                <p className="text-[10px] font-black tracking-[0.18em] text-white sm:text-sm">
                  MOLIPPY
                </p>

                <p className="mt-1 text-[6px] font-black uppercase tracking-[0.28em] text-white/70 sm:text-[8px] sm:tracking-[0.32em]">
                  PRODUCTS
                </p>
              </div>

              <div className="absolute bottom-5 left-5 right-5 z-10 sm:bottom-10 sm:left-10">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/60 sm:text-[10px] sm:tracking-[0.3em]">
                  beauty • care • confidence
                </p>

                <p className="mt-2 text-2xl font-black leading-none text-white sm:text-5xl">
                  Love your
                  <br />
                  lips loudly.
                </p>
              </div>
            </div>

            <div className="molippy-pulse absolute left-1/2 top-[45%] z-20 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex h-[230px] w-[150px] flex-col items-center justify-end rounded-[30px] bg-gradient-to-b from-white via-[#fff4f8] to-[#ffd2e3] p-4 shadow-[0_30px_55px_rgba(78,7,40,0.3)] sm:h-[420px] sm:w-[275px] sm:rounded-[46px] sm:p-6">
                <div className="absolute left-5 right-5 top-4 h-8 rounded-full bg-white/80 blur-md sm:left-7 sm:right-7 sm:top-6 sm:h-12" />

                <div className="absolute top-6 text-center sm:top-9">
                  <p className="text-[9px] font-black tracking-[0.16em] text-[#f51b78] sm:text-base sm:tracking-[0.22em]">
                    MOLIPPY
                  </p>

                  <p className="mt-1 text-[5px] font-black uppercase tracking-[0.18em] text-[#a56d80] sm:text-[8px] sm:tracking-[0.25em]">
                    PRODUCTS • LIP CARE
                  </p>
                </div>

                <div className="mb-4 flex h-28 w-20 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#ff5ca2] via-[#f51b78] to-[#9c0d51] shadow-[inset_8px_8px_15px_rgba(255,255,255,0.2),0_20px_35px_rgba(116,8,57,0.25)] sm:mb-7 sm:h-52 sm:w-36 sm:rounded-[32px]">
                  <span className="text-3xl text-white/90 sm:text-5xl">
                    ♡
                  </span>
                </div>

                <p className="text-center text-[8px] font-black uppercase tracking-[0.12em] text-[#7c3655] sm:text-sm sm:tracking-[0.18em]">
                  your everyday
                </p>

                <p className="mt-1 text-base font-black text-[#f51b78] sm:text-2xl">
                  lip ritual
                </p>
              </div>
            </div>

            {/* MOBILE-SAFE DECOR */}
            <div className="molippy-float absolute left-0 top-12 z-30 flex h-16 w-16 -rotate-12 items-center justify-center rounded-full bg-[#ffe45e] text-center text-[8px] font-black uppercase leading-3 text-[#5d3b10] shadow-xl sm:left-0 sm:top-24 sm:h-28 sm:w-28 sm:text-[10px]">
              soft lips
              <br />
              only ✦
            </div>

            <div className="molippy-float-reverse absolute bottom-12 right-0 z-30 rounded-2xl bg-white p-3 shadow-[0_20px_45px_rgba(74,12,41,0.15)] sm:bottom-24 sm:rounded-3xl sm:p-4">
              <p className="text-lg sm:text-2xl">💗</p>

              <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-[#70113d] sm:text-[10px]">
                glow mode
              </p>

              <p className="text-base font-black text-[#f51b78] sm:text-lg">
                ON
              </p>
            </div>

            <div className="absolute right-0 top-5 z-30 rounded-full bg-white px-3 py-2 text-[7px] font-black uppercase tracking-wider text-[#f51b78] shadow-lg sm:right-2 sm:top-12 sm:px-4 sm:py-3 sm:text-[9px]">
              main character ♡
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden bg-[#f51b78] py-3.5 text-white sm:py-4">
        <div className="molippy-marquee flex w-max">
          <div className="flex whitespace-nowrap text-[11px] font-black uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em]">
            <span className="mx-5 sm:mx-7">Soft lips ✦</span>
            <span className="mx-5 sm:mx-7">Big confidence ✦</span>
            <span className="mx-5 sm:mx-7">Glossy moments ✦</span>
            <span className="mx-5 sm:mx-7">Molippy girl energy ✦</span>
            <span className="mx-5 sm:mx-7">Soft lips ✦</span>
            <span className="mx-5 sm:mx-7">Big confidence ✦</span>
            <span className="mx-5 sm:mx-7">Glossy moments ✦</span>
            <span className="mx-5 sm:mx-7">Molippy girl energy ✦</span>
          </div>
        </div>
      </section>

      {/* MOLIPPY GIRL */}
      <section
        id="molippy-girl"
        className="px-5 py-16 sm:px-8 sm:py-20 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f51b78] sm:text-xs sm:tracking-[0.3em]">
                The Molippy girl
              </p>

              <h2 className="mt-4 text-[47px] font-black leading-[0.9] tracking-[-0.06em] sm:mt-5 sm:text-7xl">
                She&apos;s
                <br />
                soft.
                <br />
                She&apos;s
                <br />
                <span className="text-[#f51b78]">that girl.</span>
              </h2>

              <p className="mt-6 max-w-md text-[15px] leading-6 text-[#765963] sm:mt-7 sm:text-base sm:leading-7">
                Molippy is for the girl who romanticizes the little things,
                carries gloss everywhere and knows that taking care of
                herself is part of the lifestyle.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[30px] bg-[#ffe1ed] p-6 sm:rounded-[34px] sm:p-7 sm:min-h-[230px]">
                <span className="text-4xl">💋</span>

                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#b31559] sm:mt-8 sm:text-xs">
                  She loves
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  A good lip combo.
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#80596a]">
                  Because the lips are never an afterthought.
                </p>
              </div>

              <div className="rounded-[30px] bg-[#f51b78] p-6 text-white sm:mt-10 sm:rounded-[34px] sm:p-7 sm:min-h-[230px]">
                <span className="text-4xl">✨</span>

                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 sm:mt-8 sm:text-xs">
                  She believes
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Self-care is a vibe.
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/75">
                  Looking good and feeling good can coexist.
                </p>
              </div>

              <div className="rounded-[30px] bg-[#74113f] p-6 text-white sm:rounded-[34px] sm:p-7 sm:min-h-[230px]">
                <span className="text-4xl">♡</span>

                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff9fc3] sm:mt-8 sm:text-xs">
                  She chooses
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Herself.
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/70">
                  Every single day. Even on the messy ones.
                </p>
              </div>

              <div className="rounded-[30px] bg-[#fff0f6] p-6 sm:mt-10 sm:rounded-[34px] sm:p-7 sm:min-h-[230px]">
                <span className="text-4xl">🎀</span>

                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#f51b78] sm:mt-8 sm:text-xs">
                  Her rule
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Never leave without lip care.
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#80596a]">
                  Cute bag. Cute lips. We move.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT EDIT */}
      <section className="relative overflow-hidden bg-[#fff0f6] px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-[#ffd2e3] blur-3xl sm:h-96 sm:w-96" />

        <div className="pointer-events-none absolute -right-40 bottom-20 h-80 w-80 rounded-full bg-[#ffc0da] blur-3xl sm:h-96 sm:w-96" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end sm:gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">♡</span>

                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f51b78] sm:text-xs sm:tracking-[0.3em]">
                  The lip edit
                </p>
              </div>

              <h2 className="mt-4 text-[47px] font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl">
                Pick your
                <br />
                <span className="text-[#f51b78]">favourite.</span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-6 text-[#765963] sm:text-base">
                Build your everyday lip ritual with the products made for
                your soft lip era.
              </p>
            </div>

            <a
              href="/products"
              className="inline-flex min-h-11 items-center gap-2 self-start font-black text-[#f51b78] sm:self-auto"
            >
              Shop all products
              <span>→</span>
            </a>
          </div>

          {loadingProducts ? (
            <div className="mt-10 rounded-[30px] bg-white p-12 text-center shadow-sm sm:mt-12 sm:rounded-[35px] sm:p-14">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#ffd5e5] border-t-[#f51b78]" />

              <p className="mt-4 text-sm font-bold text-[#765963]">
                Getting the good stuff...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="mt-10 rounded-[30px] bg-white p-10 text-center shadow-sm sm:mt-12 sm:rounded-[35px] sm:p-12">
              <h3 className="text-xl font-black">
                Something beautiful is coming.
              </h3>

              <p className="mt-2 text-sm text-[#765963]">
                Check back soon for the latest Molippy Products collection.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {products.map((product, index) => {
                const isLowStock =
                  product.stock > 0 && product.stock <= 5;

                const isOutOfStock = product.stock <= 0;

                const badge =
                  index === 0
                    ? "BESTSELLER"
                    : index === 1
                      ? "GLOSSY FAV"
                      : index === 2
                        ? "LIP RITUAL"
                        : "NEW IN";

                return (
                  <a
                    key={product.id}
                    href={"/products/" + product.slug}
                    className="group relative block"
                  >
                    <div className="relative overflow-hidden rounded-[30px] bg-white shadow-[0_12px_35px_rgba(116,17,63,0.06)] transition duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_30px_65px_rgba(245,27,120,0.16)] sm:rounded-[36px]">
                      <div
                        className={`relative flex h-[285px] items-center justify-center overflow-hidden p-6 sm:h-[360px] sm:p-8 ${index === 0
                            ? "bg-gradient-to-br from-[#ffd6e7] via-[#fff7fa] to-[#ffc2db]"
                            : index === 1
                              ? "bg-gradient-to-br from-[#ffe5f0] via-white to-[#ffbfd9]"
                              : index === 2
                                ? "bg-gradient-to-br from-[#ffe0e7] via-[#fff7f9] to-[#ffd0dd]"
                                : "bg-gradient-to-br from-[#f7ddea] via-[#fff7fb] to-[#ffc8dd]"
                          }`}
                      >
                        <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 transition duration-700 group-hover:scale-110 sm:h-56 sm:w-56" />

                        <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 blur-xl sm:h-44 sm:w-44" />

                        <span className="absolute left-4 top-4 text-[9px] font-black tracking-[0.2em] text-[#8e536d]/60 sm:left-5 sm:top-5 sm:text-[10px]">
                          0{index + 1}
                        </span>

                        <span className="absolute right-4 top-4 z-20 rounded-full bg-white/90 px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[0.14em] text-[#a31254] shadow-sm backdrop-blur sm:right-5 sm:top-5 sm:px-3 sm:py-2 sm:text-[8px]">
                          {badge}
                        </span>

                        {product.images?.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="relative z-10 h-[78%] w-[82%] object-contain drop-shadow-[0_25px_20px_rgba(102,8,51,0.18)] transition duration-700 group-hover:scale-110 group-hover:-rotate-2"
                          />
                        ) : (
                          <div className="relative z-10 flex flex-col items-center transition duration-500 group-hover:scale-105">
                            <div className="flex h-36 w-24 items-center justify-center rounded-[26px] bg-gradient-to-br from-[#ff5ca2] via-[#f51b78] to-[#a50d54] shadow-[inset_8px_8px_15px_rgba(255,255,255,0.2),0_25px_40px_rgba(116,8,57,0.25)] sm:h-44 sm:w-28 sm:rounded-[30px]">
                              <span className="text-4xl text-white">
                                {productEmojis[index] || "♡"}
                              </span>
                            </div>

                            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.2em] text-[#b11658] sm:text-[9px]">
                              Molippy Products
                            </p>
                          </div>
                        )}

                        <span className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-black text-[#f51b78] shadow-lg transition duration-300 group-hover:bg-[#f51b78] group-hover:text-white sm:bottom-5 sm:right-5 sm:h-11 sm:w-11 sm:text-lg">
                          →
                        </span>

                        {isLowStock && !isOutOfStock && (
                          <span className="absolute bottom-4 left-4 z-20 rounded-full bg-[#74113f] px-2.5 py-1.5 text-[7px] font-black uppercase tracking-wider text-white sm:bottom-5 sm:left-5 sm:px-3 sm:py-2 sm:text-[8px]">
                            Only {product.stock} left
                          </span>
                        )}

                        {isOutOfStock && (
                          <span className="absolute bottom-4 left-4 z-20 rounded-full bg-[#24131c] px-2.5 py-1.5 text-[7px] font-black uppercase tracking-wider text-white sm:bottom-5 sm:left-5 sm:px-3 sm:py-2 sm:text-[8px]">
                            Sold out
                          </span>
                        )}
                      </div>

                      <div className="p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#f51b78] sm:text-[9px] sm:tracking-[0.2em]">
                            {product.category.name}
                          </p>

                          <span className="text-[8px] font-bold uppercase tracking-wider text-[#b0939f] sm:text-[9px]">
                            {product.stock > 0
                              ? "Available"
                              : "Unavailable"}
                          </span>
                        </div>

                        <h3 className="mt-2 text-lg font-black tracking-[-0.03em] sm:text-xl">
                          {product.name}
                        </h3>

                        <p className="mt-1 min-h-[20px] text-[11px] font-medium text-[#927481] sm:text-xs">
                          {productLabels[index] ||
                            "Your Molippy essential"}
                        </p>

                        <div className="mt-4 flex items-end justify-between gap-2 border-t border-[#f5e3eb] pt-4 sm:mt-5">
                          <div>
                            <p className="text-[7px] font-black uppercase tracking-[0.15em] text-[#b0939f] sm:text-[8px] sm:tracking-[0.18em]">
                              Your new obsession
                            </p>

                            <p className="mt-1 text-base font-black text-[#8d174d] sm:text-lg">

                              ₦
                              {product.price.toLocaleString("en-NG")}

                              )
                            </p>
                          </div>

                          <span className="rounded-full border border-[#f3cfde] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-[#8d174d] transition group-hover:border-[#f51b78] group-hover:bg-[#f51b78] group-hover:text-white sm:px-3 sm:py-2 sm:text-[9px]">
                            Shop now
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {!loadingProducts && products.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-[28px] bg-[#74113f] px-6 py-7 text-white sm:mt-8 sm:rounded-[32px] sm:px-10 sm:py-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#ff9fc3] sm:text-[9px] sm:tracking-[0.25em]">
                    Build your ritual
                  </p>

                  <h3 className="mt-2 text-xl font-black sm:text-3xl">
                    One lip product is never enough. ♡
                  </h3>

                  <p className="mt-2 text-xs text-white/65 sm:text-sm">
                    Cleanse. Nourish. Gloss. Repeat.
                  </p>
                </div>

                <a
                  href="/products"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-white px-5 py-3 text-xs font-black text-[#74113f] transition hover:-translate-y-1 hover:bg-[#ffe5ef] sm:px-6 sm:text-sm"
                >
                  Explore the collection →
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* WHY MOLIPPY PRODUCTS */}
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f51b78] sm:text-xs sm:tracking-[0.3em]">
              Why Molippy Products
            </p>

            <h2 className="mt-4 text-[47px] font-black leading-[0.9] tracking-[-0.06em] sm:mt-5 sm:text-7xl">
              Because lip care
              <span className="text-[#f51b78]"> should be fun.</span>
            </h2>

            <p className="mt-5 text-sm leading-6 text-[#765963] sm:mt-6 sm:text-base sm:leading-7 lg:text-lg">
              We believe taking care of yourself shouldn&apos;t feel like another
              task on your to-do list. It should feel like a little luxury.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3 md:gap-5">
            <div className="rounded-[30px] border border-[#f3d5e2] bg-white p-7 shadow-sm sm:rounded-[35px] sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffe0ec] text-2xl">
                💧
              </div>

              <h3 className="mt-6 text-2xl font-black sm:mt-7">
                Care first.
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#765963]">
                Products designed around keeping your lips feeling soft,
                nourished and cared for.
              </p>
            </div>

            <div className="rounded-[30px] bg-[#f51b78] p-7 text-white shadow-[0_20px_50px_rgba(245,27,120,0.18)] sm:rounded-[35px] sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl">
                ✨
              </div>

              <h3 className="mt-6 text-2xl font-black sm:mt-7">
                Beauty always.
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/75">
                Because your everyday essentials deserve to look and feel
                beautiful too.
              </p>
            </div>

            <div className="rounded-[30px] bg-[#74113f] p-7 text-white shadow-sm sm:rounded-[35px] sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                ♡
              </div>

              <h3 className="mt-6 text-2xl font-black sm:mt-7">
                Confidence always.
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/70">
                Molippy Products is about more than lips. It&apos;s about feeling
                good in your own skin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER STORY */}
      <section
        id="story"
        className="relative overflow-hidden bg-[#54102f] px-5 py-16 text-white sm:px-8 sm:py-20 lg:py-28"
      >
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#f51b78]/40 blur-3xl sm:h-80 sm:w-80" />

        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#ff9ec4]/20 blur-3xl sm:h-80 sm:w-80" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff9fc3] sm:text-xs sm:tracking-[0.3em]">
              The story behind Molippy Products
            </p>

            <h2 className="mt-4 text-[47px] font-black leading-[0.9] tracking-[-0.06em] sm:mt-5 sm:text-7xl">
              Started with
              <br />
              a little idea.
            </h2>

            <p className="mt-6 max-w-xl text-[15px] leading-6 text-white/70 sm:mt-7 sm:text-lg sm:leading-7">
              Molippy Products began with a simple belief: lip care can be
              effective, beautiful and personal all at once.
            </p>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60 sm:mt-5 sm:text-base">
              What started as an idea became a brand built around care,
              confidence and the little beauty rituals that make everyday
              life feel better.
            </p>

            <a
              href="/products"
              className="mt-7 inline-flex min-h-11 items-center rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#8d174d] transition hover:-translate-y-1 hover:bg-[#ffe6f0] sm:mt-8 sm:px-7 sm:py-4"
            >
              Shop Molippy Products
            </a>
          </div>

          <div className="relative px-2 sm:px-0">
            <div className="rotate-[-3deg] rounded-[32px] bg-[#f51b78] p-7 shadow-2xl sm:rounded-[40px] sm:p-12">
              <span className="text-5xl text-white/30 sm:text-6xl">
                “
              </span>

              <p className="mt-3 text-[36px] font-black leading-[1.05] tracking-tight sm:text-5xl">
                Where beauty
                <br />
                meets
                <br />
                confidence.
              </p>

              <div className="mt-8 border-t border-white/20 pt-5 sm:mt-10">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60 sm:text-[10px] sm:tracking-[0.25em]">
                  Molippy Products
                </p>
              </div>
            </div>

            <div className="absolute -bottom-5 right-0 rotate-6 rounded-2xl bg-[#ffe45e] px-4 py-3 text-center text-[9px] font-black uppercase leading-4 text-[#5d3b10] shadow-xl sm:-right-2 sm:px-5 sm:py-4 sm:text-[10px]">
              made with
              <br />
              love ♡
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden px-5 py-20 text-center sm:px-8 sm:py-24 lg:py-32">
        <div className="absolute left-1/2 top-1/2 -z-10 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd2e3] blur-3xl sm:h-[450px] sm:w-[450px]" />

        <div className="mx-auto max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f51b78] sm:text-xs sm:tracking-[0.3em]">
            Your sign to upgrade
          </p>

          <h2 className="mt-4 text-[48px] font-black leading-[0.88] tracking-[-0.07em] sm:mt-5 sm:text-7xl lg:text-8xl">
            Ready for
            <span className="block text-[#f51b78]">
              softer lips?
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-[#765963] sm:mt-7 sm:text-lg sm:leading-7">
            Your lips deserve the same energy you give everything else.
          </p>

          <a
            href="/products"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#f51b78] px-7 py-3.5 text-sm font-black text-white shadow-[0_18px_45px_rgba(245,27,120,0.28)] transition duration-300 hover:-translate-y-1 hover:bg-[#df0d66] active:scale-[0.98] sm:mt-9 sm:px-9 sm:py-4"
          >
            Start your soft lip era 💋
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#f2d9e4] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
            <div>
              <div className="flex flex-col leading-none">
                <p className="text-3xl font-black tracking-[-0.07em] text-[#f51b78]">
                  MOLIPPY
                </p>

                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.3em] text-[#74113f] sm:text-[9px] sm:tracking-[0.34em]">
                  PRODUCTS
                </p>
              </div>

              <p className="mt-4 max-w-xs text-sm leading-6 text-[#765963]">
                Lip care for soft lips, big confidence and everyday main
                character energy.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[#765963] sm:gap-x-7">
              <a
                href="/products"
                className="transition hover:text-[#f51b78]"
              >
                Shop
              </a>

              <a
                href="#molippy-girl"
                className="transition hover:text-[#f51b78]"
              >
                Molippy Girl
              </a>

              <a
                href="#story"
                className="transition hover:text-[#f51b78]"
              >
                Our Story
              </a>

              {!authLoading && user?.role === "ADMIN" ? (
                <a
                  href="/admin"
                  className="transition hover:text-[#f51b78]"
                >
                  Admin Dashboard
                </a>
              ) : (
                <a
                  href="/account"
                  className="transition hover:text-[#f51b78]"
                >
                  Account
                </a>
              )}

              <a
                href="/cart"
                className="transition hover:text-[#f51b78]"
              >
                Cart
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-[#f2d9e4] pt-5 text-[11px] text-[#a48895] sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:pt-6 sm:text-xs">
            <p>
              © {new Date().getFullYear()} Molippy Products
            </p>

            <p>
              Where beauty meets confidence. ♡
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
