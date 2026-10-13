"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("error");
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("");

  useEffect(() => {
    const requestedPath = new URLSearchParams(window.location.search).get("next");

    if (
      requestedPath &&
      requestedPath.startsWith("/") &&
      !requestedPath.startsWith("//") &&
      !requestedPath.startsWith("/\\")
    ) {
      setNextPath(requestedPath);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.message || "Unable to create your account.");
        return;
      }

      // The signup API now creates the login session automatically.
      setMessageType("success");
      setMessage("Welcome to Molippy! Your soft lip era starts now. ♡");

      setName("");
      setEmail("");
      setPassword("");

      const destination = nextPath || "/";

      window.setTimeout(() => {
        router.replace(destination);
      }, 900);
    } catch (error) {
      console.error("Signup error:", error);
      setMessageType("error");
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";

  return (
    <main className="signup-page">
      <div className="signup-shell">
        <section className="beauty-panel">
          <a href="/" className="brand-logo">
            MOLIPPY<span>PRODUCTS</span>
          </a>

          <div className="beauty-copy">
            <span className="eyebrow">YOUR EVERYDAY BEAUTY RITUAL</span>

            <h1>
              Soft lips.
              <br />
              <span>Big confidence.</span>
            </h1>

            <p>
              Your little reminder to take care of yourself, feel beautiful,
              and show up confidently every day.
            </p>

            <div className="beauty-tags">
              <span>♡ Lip care</span>
              <span>✦ Soft girl energy</span>
            </div>
          </div>

          <div className="product-art" aria-label="Illustration of pink lip-care products">
            <div className="art-sparkle sparkle-one">✦</div>
            <div className="art-sparkle sparkle-two">✧</div>
            <div className="art-sparkle sparkle-three">♡</div>
            <div className="art-circle" />

            <div className="lip-product lip-product-left">
              <div className="product-cap" />
              <div className="product-body">
                <span className="mini-brand">MOLIPPY</span>
                <span className="mini-product">LIP CARE</span>
                <span className="mini-heart">♡</span>
              </div>
            </div>

            <div className="lip-product lip-product-middle">
              <div className="product-cap" />
              <div className="product-body">
                <span className="mini-brand">MOLIPPY</span>
                <span className="mini-product">LIP GLOSS</span>
                <span className="mini-heart">✦</span>
              </div>
            </div>

            <div className="lip-product lip-product-right">
              <div className="product-cap" />
              <div className="product-body">
                <span className="mini-brand">MOLIPPY</span>
                <span className="mini-product">LIP MASK</span>
                <span className="mini-heart">♡</span>
              </div>
            </div>

            <div className="art-caption">
              <span>THE MOLIPPY GIRL</span>
              <span>Beauty starts with you.</span>
            </div>
          </div>

          <p className="panel-footer">
            Where beauty meets confidence. ♡
          </p>
        </section>

        <section className="form-panel">
          <div className="mobile-brand">
            <a href="/" className="brand-logo">
              MOLIPPY<span>PRODUCTS</span>
            </a>
          </div>

          <div className="form-content">
            <div className="form-heading">
              <span className="welcome-label">A LITTLE SELF-CARE STARTS HERE</span>

              <h2>Create your account<span>.</span></h2>

              <p>
                Join the Molippy girl community and make every lip-care moment
                feel special.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </div>

              <div className="form-field">
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

              <div className="form-field">
                <label htmlFor="password">Create a password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <span className="field-hint">
                  Choose a password with at least 6 characters.
                </span>
              </div>

              <button type="submit" className="signup-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading-dot" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create my account <span>♡</span>
                  </>
                )}
              </button>

              {message && (
                <p
                  className={`form-message ${messageType}`}
                  role="status"
                  aria-live="polite"
                >
                  {message}
                </p>
              )}
            </form>

            <div className="form-divider">
              <span>YOUR BEAUTY JOURNEY BEGINS HERE</span>
            </div>

            <p className="login-prompt">
              Already part of the Molippy family?{" "}
              <a href={loginHref}>Log in</a>
            </p>

            <a href="/" className="back-home">
              <span>←</span> Back to the Molippy store
            </a>
          </div>

          <p className="form-bottom-note">
            Made with love for your soft lip era <span>♡</span>
          </p>
        </section>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #fff8fb;
        }

        .signup-page {
          min-height: 100vh;
          padding: 38px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 5% 10%, rgba(247, 207, 224, 0.35), transparent 28%),
            #fff8fb;
          color: #382631;
          font-family: Arial, Helvetica, sans-serif;
        }

        .signup-shell {
          width: 100%;
          max-width: 1120px;
          min-height: 680px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
          border: 1px solid #f0dce6;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 25px 80px rgba(110, 47, 78, 0.1);
        }

        .beauty-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          padding: 36px 40px 25px;
          background:
            radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.8), transparent 35%),
            linear-gradient(145deg, #fce8f0 0%, #f8dce8 48%, #f5cbdc 100%);
        }

        .brand-logo {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          width: fit-content;
          color: #8c345c;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 3px;
          line-height: 1.15;
          text-decoration: none;
        }

        .brand-logo span {
          margin-top: 5px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 5px;
        }

        .beauty-copy {
          position: relative;
          z-index: 2;
          margin-top: 55px;
        }

        .eyebrow,
        .welcome-label {
          color: #a34c73;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .beauty-copy h1 {
          margin: 16px 0;
          color: #512a3c;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(34px, 4vw, 49px);
          font-weight: 500;
          letter-spacing: -1.7px;
          line-height: 1.12;
        }

        .beauty-copy h1 span {
          color: #bd5d88;
          font-style: italic;
        }

        .beauty-copy p {
          max-width: 330px;
          color: #775365;
          font-size: 13px;
          line-height: 1.9;
        }

        .beauty-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
        }

        .beauty-tags span {
          padding: 9px 12px;
          border: 1px solid rgba(157, 74, 111, 0.17);
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.42);
          color: #86405f;
          font-size: 10px;
          font-weight: 600;
        }

        .product-art {
          position: relative;
          flex: 1;
          min-height: 240px;
          margin-top: 12px;
        }

        .art-circle {
          position: absolute;
          top: 22px;
          left: 50%;
          width: 235px;
          height: 235px;
          transform: translateX(-50%);
          border: 1px solid rgba(179, 94, 132, 0.18);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.24);
          box-shadow: inset 0 0 0 18px rgba(255, 255, 255, 0.12), 0 15px 40px rgba(155, 70, 111, 0.08);
        }

        .lip-product {
          position: absolute;
          top: 72px;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 15px 10px rgba(115, 46, 78, 0.16));
        }

        .lip-product-left {
          left: calc(50% - 88px);
          top: 103px;
          transform: rotate(-13deg);
        }

        .lip-product-middle {
          left: calc(50% - 26px);
          top: 65px;
          transform: rotate(3deg);
          z-index: 2;
        }

        .lip-product-right {
          left: calc(50% + 39px);
          top: 94px;
          transform: rotate(13deg);
        }

        .product-cap {
          width: 35px;
          height: 43px;
          border: 1px solid #d6a0b8;
          border-radius: 7px 7px 3px 3px;
          background: linear-gradient(90deg, #dca8bf, #fff0f6 32%, #e7b5ca 72%, #c77f9e);
        }

        .product-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 47px;
          height: 105px;
          margin-top: -1px;
          border: 1px solid rgba(199, 112, 152, 0.5);
          border-radius: 5px 5px 13px 13px;
          background: linear-gradient(90deg, #e8a5c1, #fff1f7 38%, #f6d1e1 66%, #d98daf);
          color: #a24770;
        }

        .lip-product-middle .product-body {
          height: 120px;
          background: linear-gradient(90deg, #d98aaa, #fff0f6 35%, #f5c3d8 68%, #cc7da0);
        }

        .lip-product-right .product-body {
          background: linear-gradient(90deg, #f1c4d7, #fff7fa 40%, #e7a8c4 80%);
        }

        .mini-brand {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 6px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .mini-product {
          margin-top: 5px;
          font-size: 4px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .mini-heart {
          margin-top: 10px;
          font-size: 15px;
        }

        .art-sparkle {
          position: absolute;
          z-index: 3;
          color: #a64e77;
        }

        .sparkle-one {
          top: 44px;
          left: 22%;
          font-size: 23px;
        }

        .sparkle-two {
          top: 50px;
          right: 16%;
          font-size: 27px;
        }

        .sparkle-three {
          right: 23%;
          bottom: 28px;
          font-size: 24px;
        }

        .art-caption {
          position: absolute;
          right: 0;
          bottom: 8px;
          left: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #95506f;
        }

        .art-caption span:first-child {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .art-caption span:last-child {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 13px;
          font-style: italic;
        }

        .panel-footer {
          margin: 25px 0 0;
          color: #9a627d;
          font-size: 11px;
          text-align: center;
        }

        .form-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          padding: 45px clamp(28px, 5vw, 64px) 25px;
          background: #fff;
        }

        .mobile-brand {
          display: none;
        }

        .form-heading h2 {
          margin: 13px 0 10px;
          color: #382631;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(27px, 3vw, 35px);
          font-weight: 500;
          letter-spacing: -0.7px;
        }

        .form-heading h2 span {
          color: #c65b8b;
        }

        .form-heading > p {
          margin: 0;
          color: #887582;
          font-size: 12px;
          line-height: 1.9;
        }

        .signup-form {
          margin-top: 27px;
        }

        .form-field {
          margin-bottom: 19px;
        }

        .form-field label {
          display: block;
          margin-bottom: 8px;
          color: #493642;
          font-size: 12px;
          font-weight: 700;
        }

        .form-field input {
          display: block;
          width: 100%;
          min-height: 47px;
          padding: 13px 14px;
          border: 1px solid #eadbe3;
          border-radius: 9px;
          outline: none;
          background: #fffdfE;
          color: #382631;
          font: inherit;
          font-size: 12px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .form-field input::placeholder {
          color: #b4a2ad;
        }

        .form-field input:focus {
          border-color: #cb78a0;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(203, 120, 160, 0.12);
        }

        .field-hint {
          display: block;
          margin-top: 7px;
          color: #a08d99;
          font-size: 10px;
        }

        .signup-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          width: 100%;
          min-height: 49px;
          padding: 13px 16px;
          border: 0;
          border-radius: 9px;
          background: linear-gradient(105deg, #b94578, #d36d9b);
          box-shadow: 0 8px 20px rgba(185, 69, 120, 0.19);
          color: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .signup-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 11px 24px rgba(185, 69, 120, 0.25);
        }

        .signup-button:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }

        .signup-button span {
          font-size: 16px;
        }

        .loading-dot {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.45);
          border-top-color: #fff;
          border-radius: 50%;
          animation: molippy-spin 0.7s linear infinite;
        }

        @keyframes molippy-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .form-message {
          margin: 14px 0 0;
          padding: 11px 12px;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.7;
        }

        .form-message.success {
          background: #edf8f0;
          color: #287247;
        }

        .form-message.error {
          background: #fff0f2;
          color: #b43850;
        }

        .form-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 27px 0 20px;
          color: #b09ba7;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-align: center;
        }

        .form-divider::before,
        .form-divider::after {
          flex: 1;
          height: 1px;
          background: #f0e5eb;
          content: "";
        }

        .login-prompt {
          margin: 0;
          color: #887582;
          font-size: 11px;
          line-height: 1.8;
          text-align: center;
        }

        .login-prompt a {
          color: #b94578;
          font-weight: 800;
          text-decoration: none;
        }

        .login-prompt a:hover,
        .back-home:hover {
          text-decoration: underline;
        }

        .back-home {
          display: block;
          width: fit-content;
          margin: 23px auto 0;
          color: #8e7583;
          font-size: 11px;
          text-decoration: none;
        }

        .back-home span {
          margin-right: 5px;
        }

        .form-bottom-note {
          margin: 30px 0 0;
          color: #a08d99;
          font-size: 10px;
          text-align: center;
        }

        .form-bottom-note span {
          color: #c65b8b;
        }

        @media (min-width: 1000px) {
          .signup-shell {
            min-height: 720px;
          }
        }

        @media (max-width: 760px) {
          .signup-page {
            min-height: 100vh;
            padding: 0;
            align-items: stretch;
          }

          .signup-shell {
            min-height: 100vh;
            grid-template-columns: 1fr;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .beauty-panel {
            min-height: 0;
            padding: 25px 24px 20px;
          }

          .beauty-panel > .brand-logo {
            display: none;
          }

          .beauty-copy {
            margin-top: 15px;
          }

          .beauty-copy h1 {
            margin: 10px 0;
            font-size: 35px;
          }

          .beauty-copy p {
            max-width: 410px;
            margin-bottom: 12px;
            font-size: 12px;
          }

          .beauty-tags {
            margin-top: 12px;
          }

          .beauty-tags span {
            padding: 7px 10px;
          }

          .product-art {
            min-height: 170px;
            margin-top: 0;
          }

          .art-circle {
            top: 0;
            width: 165px;
            height: 165px;
          }

          .lip-product-left {
            left: calc(50% - 72px);
            top: 45px;
          }

          .lip-product-middle {
            left: calc(50% - 22px);
            top: 19px;
          }

          .lip-product-right {
            left: calc(50% + 29px);
            top: 42px;
          }

          .product-cap {
            width: 27px;
            height: 30px;
          }

          .product-body {
            width: 36px;
            height: 70px;
          }

          .lip-product-middle .product-body {
            height: 83px;
          }

          .mini-brand {
            font-size: 5px;
          }

          .mini-product {
            font-size: 3px;
          }

          .mini-heart {
            margin-top: 5px;
            font-size: 11px;
          }

          .sparkle-one {
            top: 22px;
            left: 18%;
          }

          .sparkle-two {
            top: 19px;
            right: 17%;
          }

          .sparkle-three {
            right: 20%;
            bottom: 12px;
          }

          .art-caption {
            bottom: 0;
          }

          .panel-footer {
            display: none;
          }

          .form-panel {
            padding: 29px 25px 25px;
          }

          .mobile-brand {
            display: block;
            margin-bottom: 27px;
          }

          .mobile-brand .brand-logo {
            font-size: 20px;
          }

          .form-heading h2 {
            font-size: 30px;
          }

          .signup-form {
            margin-top: 23px;
          }

          .form-bottom-note {
            margin-top: 27px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-dot,
          .signup-button {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}