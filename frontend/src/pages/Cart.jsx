import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";
import { toast } from "react-hot-toast";

export default function Cart() {
  const cart = useCart();

  const items = Array.isArray(cart?.items) ? cart.items : [];
  const totalPrice = Number(cart?.totalPrice || 0);

  const getStock = (item) => {
    // ✅ Use whichever field you have in your cart items
    // Recommended: item.stock
    const s = item?.stock ?? item?.inStock ?? item?.availableStock ?? null;

    // If stock is not provided, return null (means "unknown", don't block UI)
    if (s === null || s === undefined || s === "") return null;

    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const clampQty = (qty, stock) => {
    const q = Number(qty);

    // Fallback if user types weird things
    if (!Number.isFinite(q)) return 1;

    // If stock is unknown, only enforce minimum 1
    if (stock === null) return Math.max(1, q);

    // Stock known: enforce 1..stock
    return Math.min(Math.max(1, q), stock);
  };

  const setQtySafe = (productId, nextQty, stock) => {
    const clamped = clampQty(nextQty, stock);

    // if stock known and user tried to exceed, show message
    if (stock !== null && Number(nextQty) > stock) {
      toast.error(`Only ${stock} item(s) available in stock`);
    }

    cart.setQty?.(productId, clamped);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your Cart</h1>

        {items.length > 0 ? (
          <button
            onClick={() => cart.clearCart?.()}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50"
          >
            Clear
          </button>
        ) : (
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            Continue shopping
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-600">
          Cart is empty.
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((i) => {
            const price = Number(i.price || 0);
            const qty = Number(i.qty || 1);

            const stock = getStock(i); // null means "unknown"
            const atLimit = stock !== null && qty >= stock;

            const safeQty = clampQty(qty, stock);
            const lineTotal = safeQty * price;

            return (
              <div
                key={i.productId}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden">
                  {i.image ? (
                    <img
                      src={i.image}
                      alt={i.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex-1">
                  <div className="font-medium">{i.title}</div>
                  <div className="text-sm text-gray-600">৳ {price}</div>

                  {stock !== null ? (
                    <div
                      className={`text-xs mt-1 ${
                        atLimit ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {stock === 0 ? "Out of stock" : `In stock: ${stock}`}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="w-9 h-9 rounded-lg border hover:bg-gray-50"
                    onClick={() => setQtySafe(i.productId, safeQty - 1, stock)}
                    disabled={safeQty <= 1}
                    title={safeQty <= 1 ? "Minimum quantity is 1" : "Decrease"}
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="1"
                    // ✅ enforce max in the input if stock is known
                    max={stock !== null ? stock : undefined}
                    value={safeQty}
                    onChange={(e) => setQtySafe(i.productId, e.target.value, stock)}
                    className="w-16 px-3 py-2 rounded-lg border text-center"
                  />

                  <button
                    className={`w-9 h-9 rounded-lg border hover:bg-gray-50 ${
                      atLimit ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => {
                      if (atLimit) {
                        toast.error(`Only ${stock} item(s) available in stock`);
                        return;
                      }
                      setQtySafe(i.productId, safeQty + 1, stock);
                    }}
                    disabled={atLimit}
                    title={atLimit ? "Stock limit reached" : "Increase"}
                  >
                    +
                  </button>
                </div>

                <div className="w-28 text-right font-semibold">
                  ৳ {lineTotal.toFixed(2)}
                </div>

                <button
                  onClick={() => cart.removeFromCart?.(i.productId)}
                  className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            );
          })}

          <div className="flex justify-end">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 w-full max-w-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total</span>
                <span className="text-xl font-semibold">
                  ৳ {totalPrice.toFixed(2)}
                </span>
              </div>

              <Link
                to="/checkout"
                className="w-full mt-4 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-center block"
              >
                Checkout (next)
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
