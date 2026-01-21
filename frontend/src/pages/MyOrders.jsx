import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function getToken() {
  const direct =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (direct) return direct;

  const auth = localStorage.getItem("auth");
  if (auth) {
    try {
      const a = JSON.parse(auth);
      return a?.access || a?.access_token || a?.token || null;
    } catch {}
  }

  const user = localStorage.getItem("user");
  if (user) {
    try {
      const u = JSON.parse(user);
      return u?.access || u?.token || null;
    } catch {}
  }

  return null;
}

function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();

  const base =
    "inline-flex px-3 py-1 rounded-full text-xs font-medium border capitalize";

  if (s === "delivered")
    return (
      <span className={`${base} bg-green-50 border-green-200 text-green-700`}>
        {s}
      </span>
    );
  if (s === "cancelled" || s === "canceled")
    return (
      <span className={`${base} bg-red-50 border-red-200 text-red-700`}>
        {s}
      </span>
    );
  if (s === "shipped")
    return (
      <span className={`${base} bg-purple-50 border-purple-200 text-purple-700`}>
        {s}
      </span>
    );
  if (s === "processing")
    return (
      <span className={`${base} bg-yellow-50 border-yellow-200 text-yellow-700`}>
        {s}
      </span>
    );
  if (s === "confirmed")
    return (
      <span className={`${base} bg-blue-50 border-blue-200 text-blue-700`}>
        {s}
      </span>
    );

  return (
    <span className={`${base} bg-gray-50 border-gray-200 text-gray-700`}>
      {s}
    </span>
  );
}

export default function MyOrders() {
  const token = useMemo(() => getToken(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);

  // ✅ NEW: per-order download state
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        if (!token) throw new Error("Please login first.");

        const res = await axios.get("http://127.0.0.1:8000/api/orders/my/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mounted) return;

        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setOrders(data);
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.detail ||
            e?.response?.data?.error ||
            e?.message ||
            "Failed to load your orders."
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  // ✅ NEW: download invoice by order id
function downloadInvoice(orderId, orderNumber) {
  if (!token) {
    alert("Please login first.");
    return;
  }

  setDownloadingId(orderId);

  const invoiceUrl = `http://127.0.0.1:8000/api/orders/my/${orderId}/invoice/`;
  const url = `${invoiceUrl}?token=${encodeURIComponent(token)}`;

  // ✅ Browser navigation → no CORS preflight
  window.open(url, "_blank");

  setDownloadingId(null);
}


  return (
    <div className="min-h-[70vh] bg-[#f5f7fb]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">My Orders</h1>
            <p className="text-gray-600 mt-1">
              Track your order status and view past purchases.
            </p>
          </div>

          <Link
            to="/"
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 bg-white"
          >
            Continue Shopping
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="text-lg font-semibold">Loading…</div>
            <div className="text-sm text-gray-600 mt-1">
              Fetching your orders.
            </div>
          </div>
        ) : error ? (
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="text-lg font-semibold text-red-600">
              Couldn’t load orders
            </div>
            <div className="text-sm text-gray-700 mt-2">{error}</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-10 rounded-2xl shadow-sm text-center">
            <div className="text-lg font-semibold">No orders yet</div>
            <p className="text-sm text-gray-600 mt-2">
              Once you place an order, it will appear here.
            </p>
            <Link
              to="/"
              className="inline-block mt-5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {orders.map((o) => {
              const firstItem =
                Array.isArray(o.items) && o.items.length ? o.items[0] : null;
              const img = firstItem?.product_image || null;

              return (
                <div
                  key={o.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {img ? (
                          <img
                            src={img}
                            alt={
                              firstItem?.product_title ||
                              firstItem?.name ||
                              "Product"
                            }
                            className="w-full h-full object-cover"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            No image
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-sm text-gray-500">Order Number</div>
                        <div className="text-lg font-semibold">
                          {o.order_number || `#${o.id}`}
                        </div>

                        <div className="text-sm text-gray-600 mt-1">
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString()
                            : ""}
                        </div>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <StatusBadge status={o.status} />
                          <span className="text-xs text-gray-500">
                            Track progress in details
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-xl font-semibold">
                        ৳{Number(o.total || 0).toFixed(2)}
                      </div>

                      <div className="flex flex-col gap-2 mt-3 items-end">
                        <Link
                          to={`/order-success/${o.id}`}
                          className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Track / View Details
                        </Link>

                        {/* ✅ NEW: invoice download */}
                        <button
                          onClick={() => downloadInvoice(o.id, o.order_number)}
                          disabled={downloadingId === o.id}
                          className={`px-4 py-2 rounded-xl text-white ${
                            downloadingId === o.id
                              ? "bg-blue-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {downloadingId === o.id
                            ? "Downloading…"
                            : "Invoice (PDF)"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {o.items?.length ? (
                    <div className="mt-4 text-sm text-gray-700">
                      <span className="font-medium">
                        {firstItem?.product_title || firstItem?.name || "Item"}
                      </span>
                      {o.items.length > 1 ? (
                        <span className="text-gray-500">
                          {" "}
                          + {o.items.length - 1} more item(s)
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
