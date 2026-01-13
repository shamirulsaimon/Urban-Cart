import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { useToast } from "../context/ToastContext.jsx";

const API_BASE = "http://127.0.0.1:8000";

function toImageUrl(img) {
  if (!img) return null;
  if (typeof img !== "string") return null;
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  if (img.startsWith("/")) return `${API_BASE}${img}`;
  return `${API_BASE}/${img}`;
}

export default function ProductCard({ product }) {
  const priceNumber = Number(product.price || 0);
  const stock = Number(product.stock ?? 0);
  const inStock = stock > 0;

  // ✅ support both shapes
  const rawImg = product.image || product.images?.[0]?.image || null;
  const imageUrl = toImageUrl(rawImg);

  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleAdd = () => {
    if (!inStock) return;
    addToCart(product, 1); // ✅ always add 1 from cards
    showToast("Product added to cart", "success");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Image */}
      <Link to={`/products/${product.id}`}>
        <div className="aspect-[4/3] bg-gray-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No image
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <Link to={`/products/${product.id}`}>
          <h3 className="text-sm font-semibold text-primary line-clamp-2 hover:underline">
            {product.name}
          </h3>
        </Link>

        {product.brand && (
          <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg font-bold text-primary">
            ৳ {priceNumber.toLocaleString()}
          </p>

          {inStock ? (
            <span className="text-xs text-green-600 font-medium">In stock</span>
          ) : (
            <span className="text-xs text-rose-500 font-medium">Out of stock</span>
          )}
        </div>

        {/* ✅ Qty selector removed */}
        <div className="mt-4">
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
