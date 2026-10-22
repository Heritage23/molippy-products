
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type GuestCartEntry = {
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    slug?: string;
    price: number;
    stock: number;
    images: string[];
  };
};

type DatabaseCartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
  };
};

const GUEST_CART_KEY = "molippy_guest_cart";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function getSafeDestination() {
    const requestedPath = new URLSearchParams(
      window.location.search
    ).get("next");

    return requestedPath &&
      requestedPath.startsWith("/") &&
      !requestedPath.startsWith("//") &&
      !requestedPath.startsWith("/\\")
      ? requestedPath
      : "/";
  }

  function readGuestCart(): GuestCartEntry[] {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);

      if (!stored) return [];

      const parsed: unknown = JSON.parse(stored);

      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (item): item is GuestCartEntry =>
          item !== null &&
          typeof item === "object" &&
          typeof item.productId === "string" &&
          typeof item.quantity === "number" &&
          item.quantity > 0
      );
    } catch (error) {
      console.error("Unable to read guest cart:", error);
      return [];
    }
  }

  function saveGuestCart(entries: GuestCartEntry[]) {
    try {
      if (entries.length === 0) {
        localStorage.removeItem(GUEST_CART_KEY);
      } else {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(entries));
      }
    } catch (error) {
      console.error("Unable to save guest cart:", error);
      throw new Error("Unable to update your saved bag.");
    }
  }

  async function mergeGuestCart(): Promise<boolean> {
    let guestEntries = readGuestCart();

    if (guestEntries.length === 0) {
      return true;
    }

    try {
      // The login endpoint has already established the session cookie.
      // Load the customer's database cart before merging guest items.
      const cartResponse = await fetch("/api/cart", {
        cache: "no-store",
      });

      if (!cartResponse.ok) {
        throw new Error(
          "Your account is signed in, but your saved bag could not be loaded."
        );
      }

      const cartData = await cartResponse.json();

      let databaseItems: DatabaseCartItem[] = cartData.items || [];

      for (const entry of guestEntries) {
        // Refresh the remaining entries in case the merge partially succeeds.
        guestEntries = readGuestCart();

        const currentEntry = guestEntries.find(
          (item) => item.productId === entry.productId
        );

        if (!currentEntry) continue;

        const existingItem = databaseItems.find(
          (item) => item.product.id === currentEntry.productId
        );

        let mergeResponse: Response;

        if (existingItem) {
          // Update the existing database item to the combined quantity.
          // PATCH sets an absolute quantity, so repeating it won't
          // increment the same item again.
          mergeResponse = await fetch("/api/cart", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              itemId: existingItem.id,
              quantity: existingItem.quantity + currentEntry.quantity,
            }),
          });
        } else {
          // Add a guest product that isn't already in the database cart.
          mergeResponse = await fetch("/api/cart", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: currentEntry.productId,
              quantity: currentEntry.quantity,
            }),
          });
        }

        if (!mergeResponse.ok) {
          const errorData = await mergeResponse.json().catch(() => ({}));

          // If a request failed, check the database cart again.
          // This helps recover if the server saved an item but the
          // response was interrupted.
          const refreshResponse = await fetch("/api/cart", {
            cache: "no-store",
          });

          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            databaseItems = refreshedData.items || [];
          }

          const itemNowExists = databaseItems.some(
            (item) => item.product.id === currentEntry.productId
          );

          if (itemNowExists && !existingItem) {
            // Do not silently delete the guest entry on an uncertain
            // result. Leave it available for the customer to review.
            console.error(
              "Could not confirm the guest cart merge:",
              errorData.message
            );
          }

          throw new Error(
            errorData.message ||
            "Some items could not be transferred. Your guest bag has been preserved."
          );
        }

        // Remove only the successfully merged product from local storage.
        // If another item fails, the remaining entries stay saved.
        guestEntries = readGuestCart().filter(
          (item) => item.productId !== currentEntry.productId
        );

        saveGuestCart(guestEntries);

        // Refresh the database cart so subsequent items use current quantities.
        const refreshResponse = await fetch("/api/cart", {
          cache: "no-store",
        });

        if (!refreshResponse.ok) {
          throw new Error(
            "Your bag was partly transferred. Please retry to finish merging it."
          );
        }

        const refreshedData = await refreshResponse.json();
        databaseItems = refreshedData.items || [];
      }

      return readGuestCart().length === 0;
    } catch (error) {
      console.error("Guest cart merge failed:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "You are signed in, but we couldn't finish transferring your bag. Please try again."
      );

      return false;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Invalid email or password.");
        return;
      }

      // Admin users always go directly to the admin dashboard.
      if (data.user?.role === "ADMIN") {
        router.push("/admin");
        return;
      }

      const safeDestination = getSafeDestination();

      // Transfer the guest bag into the customer's database cart.
      const merged = await mergeGuestCart();

      if (!merged) {
        // Keep the customer on this page so they can retry.
        // Successfully transferred items have already been removed
        // from local storage; remaining guest items are preserved.
        return;
      }

      setMessage(
        `Welcome back, ${data.user?.name || "customer"}! 🎉`
      );

      window.setTimeout(() => {
        router.push(safeDestination);
      }, 800);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="login-page">
        <section className="brand-panel">
          <div className="brand-overlay" />

          <div className="brand-content">
            <a href="/" className="logo">
              Molippy<span>®</span>
            </a>

            <div className="brand-message">
              <p className="eyebrow">WELCOME BACK, BEAUTY</p>

              <h1>
                Your soft
                <br />
                lip era
                <br />
                <em>starts here.</em>
              </h1>

              <p className="brand-description">
                Beauty that feels good, looks good and makes you feel even
                better.
              </p>
            </div>

            <div className="floating-card">
              <div className="mini-dot" />
              <div>
                <strong>SOFT • GLOSSY • CONFIDENT</strong>
                <span>Made for your everyday glow.</span>
              </div>
            </div>
          </div>

          <div className="orb orb-one" />
          <div className="orb orb-two" />

          <div className="lip-gloss">
            <div className="gloss-cap" />
            <div className="gloss-body">
              <span>MOLIPPY</span>
            </div>
          </div>

          <div className="sparkle sparkle-one">✦</div>
          <div className="sparkle sparkle-two">✧</div>
          <div className="sparkle sparkle-three">✦</div>
        </section>

        <section className="form-panel">
          <div className="mobile-logo">
            <a href="/" className="logo">
              Molippy<span>®</span>
            </a>
          </div>

          <div className="form-container">
            <div className="form-heading">
              <p className="small-label">MOLIPPY PRODUCTS</p>

              <h2>Welcome back, babe.</h2>

              <p>Sign in to continue your beauty journey.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">Email address</label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="input-group">
                <div className="password-label">
                  <label htmlFor="password">Password</label>
                  <span>Keep it cute & secure ✨</span>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {message && (
                <div
                  className={`message ${message.toLowerCase().includes("welcome")
                      ? "success"
                      : "error"
                    }`}
                  role="status"
                  aria-live="polite"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-button"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Logging you in...
                  </>
                ) : (
                  <>
                    Login to Molippy
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            <div className="divider">
              <span>or</span>
            </div>

            <p className="signup-text">
              New to Molippy?{" "}
              <a
                href="/signup"
                onClick={(event) => {
                  event.preventDefault();
                  window.location.href = `/signup${window.location.search}`;
                }}
              >
                Create your account
              </a>
            </p>

            <a href="/" className="back-link">
              ← Back to store
            </a>
          </div>

          <div className="form-footer">
            <span>© {new Date().getFullYear()} Molippy Products</span>
            <span>Where beauty meets confidence.</span>
          </div>
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fff9fc;
          color: #35151f;
        }

        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          overflow: hidden;
          font-family: Arial, Helvetica, sans-serif;
        }

        .brand-panel {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.7), transparent 28%),
            linear-gradient(145deg, #c4115c 0%, #b72a67 40%, #f063a5 100%);
          padding: 46px;
          color: white;
        }

        .brand-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 80% 75%, rgba(255, 255, 255, 0.2), transparent 25%),
            radial-gradient(circle at 50% 100%, rgba(116, 17, 63, 0.15), transparent 35%);
          pointer-events: none;
        }

        .brand-content {
          position: relative;
          z-index: 5;
          height: 100%;
          min-height: calc(100vh - 92px);
          display: flex;
          flex-direction: column;
        }

        .logo {
          text-decoration: none;
          color: inherit;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 31px;
          font-weight: 700;
          letter-spacing: -1.5px;
        }

        .logo span {
          font-family: Arial, sans-serif;
          font-size: 9px;
          vertical-align: top;
          margin-left: 2px;
          letter-spacing: 0;
        }

        .brand-message {
          margin-top: auto;
          margin-bottom: 70px;
          max-width: 560px;
        }

        .eyebrow,
        .small-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.5px;
          margin: 0 0 18px;
        }

        .brand-message h1 {
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(58px, 6vw, 94px);
          line-height: 0.88;
          letter-spacing: -5px;
          margin: 0;
          font-weight: 500;
        }

        .brand-message h1 em {
          font-style: italic;
          color: #fff4f8;
        }

        .brand-description {
          max-width: 390px;
          margin-top: 28px;
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.88);
        }

        .floating-card {
          position: absolute;
          right: 0;
          bottom: 5px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(12px);
          border-radius: 14px;
          box-shadow: 0 12px 35px rgba(116, 17, 63, 0.12);
        }

        .floating-card strong {
          display: block;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        .floating-card span {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.8);
        }

        .mini-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 15px white;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .orb-one {
          width: 330px;
          height: 330px;
          right: -120px;
          top: -100px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.07);
        }

        .orb-two {
          width: 210px;
          height: 210px;
          left: -95px;
          bottom: -70px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .lip-gloss {
          position: absolute;
          z-index: 3;
          width: 92px;
          height: 300px;
          right: 15%;
          top: 20%;
          transform: rotate(17deg);
          filter: drop-shadow(15px 25px 25px rgba(116, 17, 63, 0.18));
          animation: float 5s ease-in-out infinite;
        }

        .gloss-cap {
          width: 70px;
          height: 105px;
          margin: 0 auto;
          border-radius: 15px 15px 7px 7px;
          background: linear-gradient(90deg, #c48da6, #f8e2eb, #c58da6);
          box-shadow: inset 4px 0 5px rgba(255, 255, 255, 0.35);
        }

        .gloss-body {
          width: 92px;
          height: 170px;
          border-radius: 10px 10px 25px 25px;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent 25%, rgba(255, 255, 255, 0.25) 50%, transparent 75%),
            linear-gradient(145deg, #fff0f6, #ed92b7);
          border: 2px solid rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          writing-mode: vertical-rl;
          color: #8c315b;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 3px;
        }

        .sparkle {
          position: absolute;
          color: rgba(255, 255, 255, 0.75);
          z-index: 2;
          font-size: 26px;
          animation: sparkle 3s ease-in-out infinite;
        }

        .sparkle-one {
          right: 12%;
          top: 15%;
        }

        .sparkle-two {
          left: 15%;
          top: 36%;
          animation-delay: 1s;
        }

        .sparkle-three {
          right: 30%;
          bottom: 25%;
          animation-delay: 2s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(17deg);
          }
          50% {
            transform: translateY(-16px) rotate(17deg);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        .form-panel {
          min-height: 100vh;
          background: #fffafd;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px clamp(30px, 7vw, 100px);
        }

        .form-container {
          width: 100%;
          max-width: 460px;
          margin: auto;
        }

        .mobile-logo {
          display: none;
        }

        .form-heading {
          margin-bottom: 38px;
        }

        .small-label {
          color: #c04b7b;
          margin-bottom: 13px;
        }

        .form-heading h2 {
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(38px, 4vw, 54px);
          line-height: 1;
          font-weight: 500;
          letter-spacing: -2px;
          color: #35151f;
        }

        .form-heading > p:last-child {
          margin: 16px 0 0;
          color: #8a7078;
          font-size: 14px;
          line-height: 1.6;
        }

        .input-group {
          margin-bottom: 22px;
        }

        .input-group label {
          display: block;
          margin-bottom: 9px;
          color: #4c3039;
          font-size: 12px;
          font-weight: 700;
        }

        .password-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
        }

        .password-label label {
          margin-bottom: 0;
        }

        .password-label span {
          font-size: 10px;
          color: #b18a99;
        }

        .input-group input {
          width: 100%;
          height: 56px;
          border: 1px solid #ead9e0;
          border-radius: 12px;
          background: white;
          padding: 0 17px;
          outline: none;
          font-size: 14px;
          color: #35151f;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .input-group input::placeholder {
          color: #bbaab1;
        }

        .input-group input:focus {
          border-color: #e277a5;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(226, 119, 165, 0.1);
        }

        .message {
          padding: 13px 15px;
          border-radius: 10px;
          font-size: 12px;
          margin: 4px 0 18px;
          line-height: 1.5;
        }

        .message.error {
          color: #9d304f;
          background: #fff0f4;
          border: 1px solid #f4ccd9;
        }

        .message.success {
          color: #357254;
          background: #eefaf3;
          border: 1px solid #c9ead6;
        }

        .login-button {
          width: 100%;
          height: 56px;
          border: none;
          border-radius: 12px;
          background: #74113f;
          color: white;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .login-button:hover:not(:disabled) {
          background: #8d174c;
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(116, 17, 63, 0.2);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .login-button span {
          font-size: 18px;
          transition: transform 0.2s ease;
        }

        .login-button:hover:not(:disabled) span {
          transform: translateX(4px);
        }

        .spinner {
          width: 16px !important;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 15px;
          margin: 28px 0 20px;
          color: #bcaab2;
          font-size: 11px;
        }

        .divider::before,
        .divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: #eee2e7;
        }

        .signup-text {
          text-align: center;
          margin: 0;
          font-size: 12px;
          color: #8a7078;
        }

        .signup-text a {
          color: #74113f;
          font-weight: 700;
          text-decoration: none;
        }

        .signup-text a:hover {
          text-decoration: underline;
        }

        .back-link {
          display: block;
          width: fit-content;
          margin: 25px auto 0;
          color: #9a7f89;
          text-decoration: none;
          font-size: 11px;
          transition: color 0.2s ease;
        }

        .back-link:hover {
          color: #74113f;
        }

        .form-footer {
          width: 100%;
          max-width: 460px;
          margin: 30px auto 0;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          color: #b7a5ad;
          font-size: 9px;
        }

        @media (max-width: 900px) {
          .login-page {
            grid-template-columns: 1fr;
          }

          .brand-panel {
            min-height: 440px;
          }

          .brand-content {
            min-height: 348px;
          }

          .brand-message {
            margin-top: auto;
            margin-bottom: 30px;
          }

          .brand-message h1 {
            font-size: clamp(52px, 11vw, 78px);
          }

          .lip-gloss {
            right: 12%;
            top: 22%;
            transform: scale(0.75) rotate(17deg);
          }

          .floating-card {
            right: auto;
            left: 0;
            bottom: 0;
          }

          .form-panel {
            min-height: auto;
            padding: 65px 30px 40px;
          }
        }

        @media (max-width: 600px) {
          .brand-panel {
            min-height: 390px;
            padding: 28px 24px;
          }

          .brand-content {
            min-height: 334px;
          }

          .brand-message {
            margin-bottom: 65px;
          }

          .brand-message h1 {
            font-size: 52px;
            letter-spacing: -3px;
          }

          .brand-description {
            max-width: 260px;
            font-size: 12px;
            margin-top: 18px;
          }

          .eyebrow {
            font-size: 8px;
            letter-spacing: 2px;
            margin-bottom: 13px;
          }

          .logo {
            font-size: 26px;
          }

          .lip-gloss {
            right: -3%;
            top: 22%;
            transform: scale(0.52) rotate(17deg);
          }

          .sparkle-one {
            right: 28%;
            top: 18%;
          }

          .sparkle-two {
            left: 20%;
            top: 35%;
          }

          .sparkle-three {
            display: none;
          }

          .floating-card {
            left: 0;
            padding: 11px 13px;
          }

          .floating-card strong {
            font-size: 7px;
          }

          .floating-card span {
            font-size: 8px;
          }

          .form-panel {
            padding: 35px 22px 30px;
          }

          .mobile-logo {
            display: block;
            text-align: center;
            margin-bottom: 45px;
            color: #f20f79;
          }

          .form-heading {
            margin-bottom: 30px;
          }

          .form-heading h2 {
            font-size: 39px;
          }

          .form-footer {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 7px;
          }
        }

        @media (max-width: 380px) {
          .brand-message h1 {
            font-size: 46px;
          }

          .brand-panel {
            min-height: 365px;
          }

          .form-heading h2 {
            font-size: 34px;
          }
        }
      `}</style>
    </>
  );
}
