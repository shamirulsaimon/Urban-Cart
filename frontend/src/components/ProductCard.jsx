import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useToast } from "../context/ToastContext.jsx";

const API_BASE = "http://127.0.0.1:8000";

/* ======================
   IMAGE HELPERS
====================== */
function toImageUrl(img) {
  if (!img) return null;

  if (typeof img === "object") {
    img = img.image || img.url || img.image_url || img.thumbnail || img.path || null;
  }

  if (!img || typeof img !== "string") return null;

  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  if (img.startsWith("/")) return `${API_BASE}${img}`;
  return `${API_BASE}/${img}`;
}

function resolveProductImage(product) {
  const fromImagesArray =
    Array.isArray(product?.images) && product.images.length > 0
      ? product.images[0]
      : null;

  const raw =
    product?.image ||
    product?.image_url ||
    product?.thumbnail ||
    product?.thumbnail_url ||
    product?.main_image ||
    product?.main_image_url ||
    fromImagesArray ||
    null;

  return toImageUrl(raw);
}

/* ======================
   PRICE HELPERS
====================== */
function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function computeFallbackDiscount(product) {
  const price = Number(product?.price ?? 0);
  const type = product?.discountType ?? product?.discount_type;
  const value = Number(product?.discountValue ?? product?.discount_value ?? 0);

  if (!type || !Number.isFinite(price) || price <= 0 || value <= 0) {
    return { hasDiscount: false };
  }

  let save = 0;
  const t = String(type).toUpperCase();

  if (t === "PERCENT" || t === "PERCENTAGE") {
    save = (price * value) / 100;
  } else if (t === "FLAT" || t === "FIXED" || t === "AMOUNT") {
    save = value;
  }

  if (save <= 0) return { hasDiscount: false };
  if (save > price) save = price;

  return {
    hasDiscount: true,
    finalPrice: price - save,
    discountAmount: save,
  };
}

/* ======================
   COMPONENT
====================== */
export default function ProductCard({ product }) {
  const stock = Number(product?.stock ?? 0);
  const inStock = stock > 0;

  const imageUrl = resolveProductImage(product);
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleAdd = () => {
    if (!inStock) return;
    addToCart(product, 1);
    showToast("Product added to cart", "success");
  };

  const brand = product?.brand || product?.brand_name || "";

  // ✅ Prefer backend-computed discount fields
  const hasDiscount =
    product?.hasDiscount ??
    product?.has_discount ??
    false;

  const finalPrice =
    product?.finalPrice ??
    product?.final_price;

  const discountAmount =
    product?.discountAmount ??
    product?.discount_amount;

  // ✅ Fallback compute if backend didn't send computed values
  const fallback = computeFallbackDiscount(product);

  const showDiscount = hasDiscount || fallback.hasDiscount;

  const displayFinal =
    finalPrice != null
      ? finalPrice
      : fallback.finalPrice;

  const displaySave =
    discountAmount != null
      ? discountAmount
      : fallback.discountAmount;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Image */}
      <Link to={`/products/${product?.id}`}>
        <div className="relative aspect-[4/3] bg-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product?.title || product?.name || "Product"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No image
            </div>
          )}

          {/* ✅ Discount badge */}
          {showDiscount && (
            <span className="absolute top-2 left-2 text-xs px-3 py-1 rounded-full bg-emerald-50 border border-emer

            emerald-200 text-emerald-700">
              Discount
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title */}
        <Link to={`/products/${product?.id}`}>
          <h3 className="text-sm font-semibold text-primary line-clamp-2 hover:underline">
            {product?.title || product?.name}
          </h3>
        </Link>

        {/* Brand */}
        {brand ? (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{brand}</p>
        ) : (
          <div className="mt-1" />
        )}

        {/* ✅ Price block */}
        <div className="mt-2">
          {showDiscount ? (
            <>
              <div className="text-lg font-bold text-blue-700">
                ৳ {money(displayFinal)}
              </div>
              <div className="text-xs text-gray-600">
                <span className="line-through">৳ {money(product?.price)}</span>
                {displaySave != null && (
                  <span className="ml-2 text-emerald-700 font-medium">
                    Save ৳ {money(displaySave)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-lg font-bold text-primary">
              ৳ {money(product?.price)}
            </div>
          )}
        </div>

        {/* Add to cart */}
        <div className="mt-auto pt-4">
          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={`w-full text-xs font-medium py-3 rounded-lg transition ${
              inStock
                ? "bg-sky-500 text-white hover:bg-sky-600"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {inStock ? "Add to cart" : "Out of stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
