import { useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useCart } from "../hooks/useCart.js";

function getToken() {
  // try direct keys
  const direct =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (direct) return direct;

  // try JSON containers
  const auth = localStorage.getItem("auth");
  if (auth) {
    try {
      const a = JSON.parse(auth);
      return a?.access || a?.access_token || a?.token || null;
    } catch {
      // ignore
    }
  }

  const user = localStorage.getItem("user");
  if (user) {
    try {
      const u = JSON.parse(user);
      return u?.access || u?.token || null;
    } catch {
      // ignore
    }
  }

  return null;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart();

  const items = Array.isArray(cart?.items) ? cart.items : [];
  const totalPrice = Number(cart?.totalPrice || 0);

  const token = useMemo(() => getToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    shipping_name: "",
    phone: "",
    address: "",
    city: "",
    note: "",
    payment_method: "cod", // "cod" | "sslcommerz"
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) return setError("Please login first.");
    if (items.length === 0) return setError("Your cart is empty.");
    if (!form.shipping_name || !form.phone || !form.address || !form.city) {
      return setError("Please fill all required fields.");
    }

    try {
      setLoading(true);

      // 1) Create order (same as your architecture)
      const res = await axios.post(
        "http://127.0.0.1:8000/api/orders/checkout/",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ support different backend response keys
      const orderId = res?.data?.id || res?.data?.order_id || res?.data?.orderId;

      if (!orderId) {
        throw new Error("Order created but order id was not returned.");
      }

      // 2) SSLCommerz (Faculty Demo): redirect to payment selection page
      if (form.payment_method === "sslcommerz") {
        // ✅ IMPORTANT: do NOT clear cart here.
        // Cart should only clear after OTP verification success (demo flow).
        navigate(`/payment/select?orderId=${encodeURIComponent(orderId)}`, {
          replace: true,
        });
        return;
      }

      // 3) COD flow: Clear cart AFTER successful creation
      cart.clearCart?.();

      // ✅ Redirect to success page
      navigate(`/order-success/${orderId}`, { replace: true });
    } catch (err) {
      const apiMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Checkout failed. Please try again.";
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-lg font-semibold mb-4">Shipping Details</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Full Name *</label>
                <input
                  name="shipping_name"
                  value={form.shipping_name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Phone *</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Address *</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 min-h-[90px]"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">City *</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Note</label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
                />
              </div>

              {/* ✅ Payment Method */}
              <div>
                <label className="block text-sm mb-2 font-medium">
                  Payment Method *
                </label>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={form.payment_method === "cod"}
                      onChange={handleChange}
                    />
                    <span>Cash on Delivery</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment_method"
                      value="sslcommerz"
                      checked={form.payment_method === "sslcommerz"}
                      onChange={handleChange}
                    />
                    <span className="flex items-center gap-2">
                      Pay Online (SSLCommerz)
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                        Demo Flow
                      </span>
                    </span>
                  </label>

                  {form.payment_method === "sslcommerz" && (
                    <p className="ml-6 text-xs text-gray-600">
                      You will be redirected to a demo payment page (bKash/Card) and OTP will be sent to your login email.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="w-full mt-2 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : form.payment_method === "sslcommerz"
                  ? "Continue to Payment"
                  : "Place Order"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            {items.length === 0 ? (
              <p className="text-gray-500">Your cart is empty.</p>
            ) : (
              <div className="space-y-3">
                {items.map((i) => {
                  const price = Number(i.price || 0);
                  const qty = Number(i.qty || 1);
                  const lineTotal = price * qty;

                  const img = i.image || i.imageUrl || i.thumbnail || null;

                  return (
                    <div key={i.productId} className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl border bg-gray-50 overflow-hidden flex-shrink-0">
                        {img ? (
                          <img
                            src={img}
                            alt={i.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {i.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Qty: {qty}
                        </p>
                      </div>

                      <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        ৳ {lineTotal.toFixed(2)}
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Total</span>
                  <span className="text-xl font-semibold whitespace-nowrap">
                    ৳ {totalPrice.toFixed(2)}
                  </span>
                </div>

                {!token && (
                  <p className="text-xs text-red-600 mt-2">
                    Token not found in localStorage. Please login again.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
