
import Link from "next/link";

export default function WishlistPage() {
  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-16 text-gray-800">
      <div className="mx-auto max-w-2xl rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="text-3xl">💗</p>

        <h1 className="mt-4 text-2xl font-semibold">
          Your Wishlist
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Your favourite Molippy products can live here. We're preparing this
          space for your beauty wishlist.
        </p>

        <Link
          href="/products"
          className="mt-7 inline-flex rounded-full bg-pink-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-pink-700"
        >
          Explore Products
        </Link>
      </div>
    </main>
  );
}
