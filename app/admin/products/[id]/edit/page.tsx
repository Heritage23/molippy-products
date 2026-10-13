"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  shade: string | null;
  flavor: string | null;
  ingredients: string | null;
  images: string[];
  isActive: boolean;
  categoryId: string;
  category: {
    name: string;
  };
};

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [shade, setShade] = useState("");
  const [flavor, setFlavor] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setMessage("");

        const [productResponse, categoriesResponse] =
          await Promise.all([
            fetch(`/api/admin/products/${productId}`),
            fetch("/api/categories"),
          ]);

        const productData = await productResponse.json();
        const categoriesData = await categoriesResponse.json();

        if (!productResponse.ok) {
          setMessage(
            productData.message || "Unable to load product."
          );
          return;
        }

        if (!categoriesResponse.ok) {
          setMessage(
            categoriesData.message ||
              "Unable to load categories."
          );
          return;
        }

        const loadedProduct: Product = productData.product;

        setProduct(loadedProduct);
        setName(loadedProduct.name);
        setSlug(loadedProduct.slug);
        setDescription(loadedProduct.description || "");
        setPrice(String(loadedProduct.price / 100));
        setStock(String(loadedProduct.stock));
        setCategoryId(loadedProduct.categoryId);
        setShade(loadedProduct.shade || "");
        setFlavor(loadedProduct.flavor || "");
        setIngredients(loadedProduct.ingredients || "");
        setIsActive(loadedProduct.isActive);
        setImages(loadedProduct.images || []);

        setCategories(
          categoriesData.categories || categoriesData
        );
      } catch (error) {
        console.error(error);
        setMessage("Unable to load product.");
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      loadData();
    }
  }, [productId]);

  async function uploadImages(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const cloudName =
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      const uploadPreset =
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName) {
        setMessage(
          "Cloudinary Cloud Name is missing. Check your .env file."
        );
        return;
      }

      if (!uploadPreset) {
        setMessage(
          "Cloudinary upload preset is missing. Check your .env file."
        );
        return;
      }

      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setMessage(`${file.name} is not an image.`);
          continue;
        }

        const maxSize = 10 * 1024 * 1024;

        if (file.size > maxSize) {
          setMessage(
            `${file.name} is too large. Please use an image under 10MB.`
          );
          continue;
        }

        const formData = new FormData();

        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("Cloudinary error:", data);

          setMessage(
            data.error?.message ||
              `Unable to upload ${file.name}.`
          );

          continue;
        }

        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      }

      if (uploadedUrls.length > 0) {
        setImages((current) => [
          ...current,
          ...uploadedUrls,
        ]);

        setMessage(
          uploadedUrls.length === 1
            ? "Image uploaded successfully."
            : `${uploadedUrls.length} images uploaded successfully.`
        );
      }
    } catch (error) {
      console.error("Image upload error:", error);

      setMessage(
        "Unable to upload image. Please try again."
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");

    if (!name.trim()) {
      setMessage("Please enter a product name.");
      return;
    }

    if (!slug.trim()) {
      setMessage("Please enter a product slug.");
      return;
    }

    if (!price || Number(price) < 0) {
      setMessage("Please enter a valid price.");
      return;
    }

    if (!categoryId) {
      setMessage("Please select a category.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/products/${productId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim(),
            price: Math.round(Number(price) * 100),
            stock: Number(stock) || 0,
            shade: shade.trim(),
            flavor: flavor.trim(),
            ingredients: ingredients.trim(),
            images,
            categoryId,
            isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Unable to update product."
        );
        return;
      }

      setProduct(data.product);
      setImages(data.product.images || []);
      setIsActive(data.product.isActive);

      setMessage("Product updated successfully.");
    } catch (error) {
      console.error(error);

      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-5 py-12 text-[#24151d]">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold text-[#ec1677]">
            MOLIPPY PRODUCTS
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Loading product...
          </h1>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#fff8fb] px-5 py-16 text-[#24151d]">
        <div className="mx-auto max-w-2xl rounded-[28px] bg-white p-8 text-center">
          <p className="text-sm text-[#ec1677]">
            {message}
          </p>

          <a
            href="/admin/products"
            className="mt-6 inline-flex rounded-full bg-[#24151d] px-6 py-3 text-sm font-bold text-white"
          >
            Back to Products
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#24151d] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <a
          href="/admin/products"
          className="text-sm font-semibold text-[#806b75] transition hover:text-[#ec1677]"
        >
          ← Back to Products
        </a>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ec1677]">
            Product management
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Edit Product
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#806b75]">
            Update your product details, stock, images and
            availability.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          {/* BASIC INFORMATION */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black">
              Basic information
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Product name
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Slug
                </label>

                <input
                  value={slug}
                  onChange={(event) =>
                    setSlug(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Category
                </label>

                <select
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                >
                  <option value="">Select category</option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Price (₦)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(event) =>
                    setStock(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>
            </div>
          </section>

          {/* PRODUCT DETAILS */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black">
              Product details
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Shade
                </label>

                <input
                  value={shade}
                  onChange={(event) =>
                    setShade(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Flavor
                </label>

                <input
                  value={flavor}
                  onChange={(event) =>
                    setFlavor(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#806b75]">
                  Ingredients
                </label>

                <textarea
                  value={ingredients}
                  onChange={(event) =>
                    setIngredients(event.target.value)
                  }
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 outline-none focus:border-[#ec1677]"
                />
              </div>
            </div>
          </section>

          {/* PRODUCT IMAGES */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black">
              Product images
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#806b75]">
              Upload product photos directly from your device.
              You can select multiple images at once.
            </p>

            <div className="mt-6">
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-pink-200 bg-[#fff8fb] px-6 py-10 text-center transition hover:border-[#ec1677] hover:bg-pink-50 ${
                  uploading
                    ? "pointer-events-none opacity-60"
                    : ""
                }`}
              >
                <div className="text-4xl">
                  {uploading ? "⏳" : "📷"}
                </div>

                <p className="mt-3 text-sm font-bold">
                  {uploading
                    ? "Uploading images..."
                    : "Choose photos from your device"}
                </p>

                <p className="mt-1 text-xs text-[#806b75]">
                  JPG, PNG, WEBP • Maximum 10MB per image
                </p>

                <span className="mt-5 rounded-full bg-[#ec1677] px-6 py-3 text-sm font-bold text-white">
                  {uploading
                    ? "Uploading..."
                    : "Select Images"}
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={uploadImages}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {images.length > 0 ? (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold">
                    {images.length}{" "}
                    {images.length === 1
                      ? "image"
                      : "images"}{" "}
                    selected
                  </p>

                  <p className="text-xs text-[#806b75]">
                    First image = main image
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {images.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="overflow-hidden rounded-2xl border border-pink-100 bg-[#fff8fb]"
                    >
                      <div className="relative h-40">
                        <img
                          src={image}
                          alt={`${name} image ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.opacity =
                              "0.3";
                          }}
                        />

                        {index === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#ec1677] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                            Main image
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 p-3">
                        <p className="truncate text-xs text-[#806b75]">
                          Image {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="shrink-0 text-xs font-bold text-red-500 transition hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-pink-200 bg-[#fff8fb] px-5 py-10 text-center">
                <p className="text-sm font-semibold text-[#806b75]">
                  No product images yet.
                </p>

                <p className="mt-1 text-xs text-[#a28b95]">
                  Choose photos from your device above.
                </p>
              </div>
            )}
          </section>

          {/* STORE VISIBILITY */}
          <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black">
              Store visibility
            </h2>

            <label className="mt-5 flex cursor-pointer items-center justify-between gap-5 rounded-2xl bg-[#fff8fb] p-4">
              <div>
                <p className="font-bold">
                  Product is active
                </p>

                <p className="mt-1 text-xs leading-5 text-[#806b75]">
                  Active products are visible to customers in
                  the store.
                </p>
              </div>

              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) =>
                  setIsActive(event.target.checked)
                }
                className="h-5 w-5 accent-[#ec1677]"
              />
            </label>
          </section>

          {message && (
            <div
              className={`rounded-2xl px-5 py-4 text-sm font-semibold ${
                message.includes("successfully")
                  ? "bg-green-50 text-green-700"
                  : "bg-pink-50 text-[#ec1677]"
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <a
              href="/admin/products"
              className="flex min-h-12 items-center justify-center rounded-full border border-pink-100 bg-white px-7 py-3 text-sm font-bold"
            >
              Cancel
            </a>

            <button
              type="submit"
              disabled={saving || uploading}
              className="min-h-12 rounded-full bg-[#ec1677] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#d70f67] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}