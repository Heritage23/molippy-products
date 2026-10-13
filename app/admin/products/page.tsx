"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  category: {
    name: string;
  };
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadProducts() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/products");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to load products.");
        return;
      }

      setProducts(data);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleDelete(productId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    setDeletingId(productId);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        window.alert(data.message || "Unable to delete product.");
        return;
      }

      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productId)
      );

      window.alert("Product deleted successfully.");
    } catch (error) {
      console.error(error);
      window.alert("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-5 py-10 text-[#24151d]">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold text-[#ec1677]">
            MOLIPPY PRODUCTS
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Loading products...
          </h1>
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-5 py-16 text-[#24151d]">
        <div className="mx-auto max-w-2xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ec1677]">
            MOLIPPY PRODUCTS
          </p>

          <h1 className="mt-4 text-3xl font-black">
            Unable to load products
          </h1>

          <p className="mt-3 text-sm text-[#806b75]">{message}</p>

          <button
            type="button"
            onClick={loadProducts}
            className="mt-6 rounded-full bg-[#ec1677] px-6 py-3 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#24151d] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <a
          href="/admin"
          className="text-sm font-semibold text-[#806b75] transition hover:text-[#ec1677]"
        >
          ← Back to Admin
        </a>

        <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ec1677]">
              Product management
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Products
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#806b75]">
              Manage your Molippy products, prices, stock, images and
              availability.
            </p>
          </div>

          <a
            href="/admin/products/new"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ec1677] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#d70f67]"
          >
            + Add Product
          </a>
        </div>

        <div className="mt-8 rounded-[24px] bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-[#806b75]">
            <strong className="text-[#24151d]">{products.length}</strong>{" "}
            {products.length === 1 ? "product" : "products"} in your
            catalogue.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-6 rounded-[28px] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-2xl text-[#ec1677]">
              ♡
            </div>

            <h2 className="mt-5 text-2xl font-black">
              No products yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#806b75]">
              Add your first Molippy product to start building your
              catalogue.
            </p>

            <a
              href="/admin/products/new"
              className="mt-6 inline-flex rounded-full bg-[#ec1677] px-6 py-3 text-sm font-bold text-white"
            >
              Add your first product
            </a>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const isSoldOut = product.stock <= 0;
              const isLowStock =
                product.stock > 0 && product.stock <= 5;

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[28px] bg-white shadow-sm"
                >
                  <div className="relative h-64 overflow-hidden bg-[#f7e8ee]">
                    {product.images?.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-[#ec1677]">
                            ♡
                          </div>

                          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b7c88]">
                            No image
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 rounded-full bg-[#24151d] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                      {product.category.name}
                    </div>

                    <div className="absolute right-4 top-4">
                      <span
                        className={`rounded-full px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] ${
                          product.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h2 className="text-xl font-black">
                      {product.name}
                    </h2>

                    <p className="mt-2 text-xl font-black text-[#ec1677]">
                      ₦{(product.price / 100).toLocaleString("en-NG")}
                    </p>

                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#fff8fb] px-4 py-3">
                      <span className="text-xs font-semibold text-[#806b75]">
                        Stock
                      </span>

                      <span
                        className={`text-sm font-black ${
                          isSoldOut
                            ? "text-red-500"
                            : isLowStock
                              ? "text-orange-500"
                              : "text-green-600"
                        }`}
                      >
                        {isSoldOut
                          ? "Sold out"
                          : isLowStock
                            ? `${product.stock} left`
                            : product.stock}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-[#9a818c]">
                      {product.images?.length || 0} product{" "}
                      {product.images?.length === 1
                        ? "image"
                        : "images"}
                    </p>

                    <div className="mt-5 flex gap-2">
                      <a
                        href={`/admin/products/${product.id}/edit`}
                        className="flex-1 rounded-full bg-[#24151d] px-4 py-3 text-center text-xs font-bold text-white transition hover:bg-[#ec1677]"
                      >
                        Edit Product
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="rounded-full border border-red-200 px-4 py-3 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === product.id
                          ? "..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}