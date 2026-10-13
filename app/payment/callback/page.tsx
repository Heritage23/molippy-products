"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [message, setMessage] = useState("Verifying your payment...");
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      if (!reference || !reference.trim()) {
        setSuccess(false);
        setVerifying(false);
        setMessage("Payment reference was not found.");
        return;
      }

      setVerifying(true);
      setSuccess(false);
      setMessage(
        retryCount > 0
          ? "Retrying payment verification..."
          : "Verifying your payment..."
      );

      try {
        const response = await fetch(
          `/api/payments/verify?reference=${encodeURIComponent(reference)}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const data = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok) {
          setSuccess(false);
          setMessage(
            data?.message ||
              "We couldn't verify your payment right now. Please try again."
          );
          return;
        }

        setSuccess(true);
        setMessage(
          "Payment successful! Your Molippy order has been confirmed."
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Payment callback verification error:", error);

        setSuccess(false);
        setMessage(
          "We couldn't connect to verify your payment. If you were charged, please do not pay again. You can retry verification below."
        );
      } finally {
        if (!cancelled) {
          setVerifying(false);
        }
      }
    }

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [reference, retryCount]);

  function handleRetry() {
    setVerifying(true);
    setRetryCount((count) => count + 1);
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2d1721]">
      <header className="border-b border-[#f2dfe7] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-5 py-6">
          <a
            href="/"
            className="font-serif text-2xl font-bold tracking-[-0.03em] text-[#e91e63]"
          >
            MOLIPPY
            <span className="ml-1 text-[#2d1721]">PRODUCTS</span>
          </a>
        </div>
      </header>

      <section className="flex min-h-[calc(100vh-89px)] items-center justify-center px-5 py-12">
        <div className="w-full max-w-2xl">
          <div className="relative mx-auto mb-[-35px] h-24 w-24">
            <div className="absolute inset-0 rounded-full bg-[#ffe0ec]" />
            <div className="absolute -right-3 -top-2 h-7 w-7 rounded-full bg-[#e91e63]/20" />
            <div className="absolute -bottom-1 -left-4 h-5 w-5 rounded-full bg-[#f5b4c9]/40" />

            <div className="relative flex h-full items-center justify-center text-4xl">
              {success ? "♡" : verifying ? "✦" : "!"}
            </div>
          </div>

          <div className="rounded-[36px] border border-[#f0dfe6] bg-white px-6 pb-10 pt-16 text-center shadow-[0_25px_80px_rgba(94,28,56,0.08)] sm:px-12 sm:pb-14">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e91e63]">
              {success
                ? "Order confirmed"
                : verifying
                  ? "One moment"
                  : "Payment update"}
            </p>

            <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {success ? (
                <>
                  Your lips are about
                  <br />
                  <span className="italic text-[#e91e63]">
                    to thank you.
                  </span>
                </>
              ) : verifying ? (
                <>
                  We're checking
                  <br />
                  <span className="italic text-[#e91e63]">
                    your payment.
                  </span>
                </>
              ) : (
                <>
                  We couldn't
                  <br />
                  <span className="italic text-[#e91e63]">
                    confirm it yet.
                  </span>
                </>
              )}
            </h1>

            {verifying && (
              <div
                className="mt-8 flex justify-center"
                role="status"
                aria-label="Verifying payment"
              >
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#f5dce6] border-t-[#e91e63]" />
              </div>
            )}

            <p
              className="mx-auto mt-7 max-w-lg text-sm leading-7 text-[#806a75] sm:text-base"
              role="status"
              aria-live="polite"
            >
              {message}
            </p>

            {success && (
              <div className="mx-auto mt-8 max-w-lg rounded-3xl bg-[#fff4f8] p-5 text-left">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffe1ed] text-[#e91e63]">
                    ✓
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#3d2932]">
                      What's next?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8d7580]">
                      Your payment has been verified and your order
                      confirmed. We'll prepare your Molippy products for
                      delivery.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!success && !verifying && (
              <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-red-100 bg-red-50 p-5 text-left">
                <p className="text-sm font-semibold text-red-800">
                  Please don't pay again just yet.
                </p>
                <p className="mt-1 text-xs leading-5 text-red-600">
                  This message does not necessarily mean your payment failed.
                  If you were charged, retry verification or contact support
                  before making another payment.
                </p>
              </div>
            )}

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              {success ? (
                <>
                  <a
                    href="/products"
                    className="inline-flex items-center justify-center rounded-full bg-[#e91e63] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#c91854]"
                  >
                    Continue shopping
                    <span className="ml-2">→</span>
                  </a>
                  <a
                    href="/account"
                    className="inline-flex items-center justify-center rounded-full border border-[#ead8e1] bg-white px-8 py-3.5 text-sm font-bold text-[#4f3842] transition hover:border-[#e91e63] hover:text-[#e91e63]"
                  >
                    View my account
                  </a>
                </>
              ) : (
                <>
                  {reference && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={verifying}
                      className="inline-flex items-center justify-center rounded-full bg-[#e91e63] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#c91854] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {verifying
                        ? "Verifying..."
                        : "Try verification again"}
                    </button>
                  )}
                  <a
                    href="/products"
                    className="inline-flex items-center justify-center rounded-full border border-[#ead8e1] bg-white px-8 py-3.5 text-sm font-bold text-[#4f3842] transition hover:border-[#e91e63] hover:text-[#e91e63]"
                  >
                    Browse products
                  </a>
                </>
              )}
            </div>

            <div className="mt-10 border-t border-[#f2e4e9] pt-7">
              <p className="font-serif text-lg font-semibold text-[#e91e63]">
                MOLIPPY PRODUCTS
              </p>
              <p className="mt-1 text-xs text-[#a08b94]">
                Where beauty meets confidence. ♡
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-5 text-center text-[#806a75]">
          Loading your payment status...
        </main>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
