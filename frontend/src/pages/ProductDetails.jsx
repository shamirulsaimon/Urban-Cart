import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "../utils/axios"; // keep if you have it, otherwise replace with fetch

const API_BASE = "http://127.0.0.1:8000";

function toImageUrl(img) {
  if (!img || typeof img !== "string") return null;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  if (img.startsWith("/")) return `${API_BASE}${img}`;
  return `${API_BASE}/${img}`;
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function ProductDetails() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [product, setProduct] = useState(null);

  const [qty, setQty] = useState(1);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErrorMsg("");
      setProduct(null);

      try {
        const res = await axios.get(`/api/catalog/products/${id}/`);
        if (!alive) return;
        setProduct(res.data);
      } catch (e) {
        console.error(e);
        if (!alive) return;

        const status = e?.response?.status;
        const msg =
          status === 404
            ? "Product not found."
            : "Failed to load product. Check backend.";
        setErrorMsg(msg);
        toast.error(msg);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const stock = toNumber(product?.stock ?? 0);
  const outOfStock = stock <= 0;
  const atLimit = !outOfStock && qty >= stock;

  // ✅ Your API: images: [ "url", "url" ]
  const imageUrl = useMemo(() => {
    const first = product?.images?.[0] || null;
    return toImageUrl(first);
  }, [product]);

  // keep qty within 1..stock
  useEffect(() => {
    if (!product || outOfStock) return;
    if (qty < 1) setQty(1);
    if (qty > stock) setQty(stock);
  }, [qty, stock, outOfStock, product]);

  const increment = () => {
    if (outOfStock) return;
    if (atLimit) return toast.error(`Only ${stock} item(s) available in stock`);
    setQty((q) => q + 1);
  };

  const decrement = () => setQty((q) => Math.max(1, q - 1));

  const addToCart = async () => {
    if (outOfStock) return toast.error("This product is out of stock");

    try {
      // ✅ Your cart serializer expects productId + qty
      await axios.post("/api/cart/items/", { productId: product.id, qty });
      toast.success("Added to cart");
    } catch (e) {
      const msg =
        e?.response?.data?.qty?.[0] ||
        e?.response?.data?.detail ||
        "Failed to add to cart";
      toast.error(msg);
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-10">Loading...</div>;

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-white border rounded-xl p-6">
          <h1 className="text-xl font-semibold">Product</h1>
          <p className="mt-2 text-gray-600">{errorMsg || "Not available."}</p>
        </div>
      </div>
    );
  }

  const title = product.title || "Untitled";
  const brand = product.brand || "—";
  const desc = product.description || "No description.";
  const tags = Array.isArray(product.tags) ? product.tags : [];

  const hasDiscount = !!product.hasDiscount;
  const price = toNumber(product.price || 0);
  const finalPrice = toNumber(product.finalPrice ?? product.final_price ?? price);
  const discountAmount = toNumber(product.discountAmount ?? product.discount_amount ?? 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Image */}
      <div className="bg-white rounded-xl border p-6 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[420px] object-contain"
          />
        ) : (
          <div className="text-gray-400">No image</div>
        )}
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <p className="text-sm text-gray-500">Brand: {brand}</p>

        <h1 className="text-2xl font-semibold">{title}</h1>

        {/* ✅ Discount-aware pricing */}
        {hasDiscount ? (
          <div className="space-y-1">
            <p className="text-3xl font-bold text-blue-600">
              ৳ {finalPrice.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              <span className="line-through">৳ {price.toLocaleString()}</span>
              <span className="ml-2 text-emerald-700 font-medium">
                Save ৳ {discountAmount.toLocaleString()}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-3xl font-bold text-blue-600">
            ৳ {price.toLocaleString()}
          </p>
        )}

        {outOfStock ? (
          <p className="text-red-600 font-medium">Out of stock</p>
        ) : (
          <p className="text-green-600 font-medium">
            In stock — only {stock} left
          </p>
        )}

        <p className="text-gray-700 leading-relaxed">{desc}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 border"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Qty selector */}
        {!outOfStock && (
          <div className="flex items-center gap-4">
            <button onClick={decrement} className="px-3 py-1 border rounded">
              −
            </button>

            <span className="min-w-[30px] text-center">{qty}</span>

            <button
              onClick={increment}
              disabled={atLimit}
              className={`px-3 py-1 border rounded ${
                atLimit ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              +
            </button>
          </div>
        )}

        <button
          onClick={addToCart}
          disabled={outOfStock}
          className={`mt-2 px-6 py-3 rounded-lg text-white font-medium ${
            outOfStock
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
