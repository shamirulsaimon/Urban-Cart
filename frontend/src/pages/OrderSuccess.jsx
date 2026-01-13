import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import OrderStatusTimeline from "../admin/components/OrderStatusTimeline";

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

function cap(s) {
  if (!s) return "";
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

export default function OrderSuccess() {
  const { orderId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  // ✅ invoice download state
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // ✅ payment refresh state
  const [refreshing, setRefreshing] = useState(false);

  const token = useMemo(() => getToken(), []);

  async function fetchOrder({ silent = false } = {}) {
    try {
      if (!silent) {
        setLoading(true);
        setError("");
      }

      if (!token) throw new Error("Please login first.");

      const url = `http://127.0.0.1:8000/api/orders/my/${orderId}/`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrder(res.data);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load order."
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadOrder() {
      if (!mounted) return;
      await fetchOrder();
    }

    loadOrder();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token]);

  // ✅ Auto refresh for SSLCommerz when payment not confirmed yet
  useEffect(() => {
    if (!order) return;

    const method = String(order?.payment_method || "").toLowerCase();
    const pstatus = String(order?.payment_status || "").toLowerCase();

    if (method !== "sslcommerz" || pstatus === "paid") return;

    let tries = 0;
    const maxTries = 6; // ~30 sec total
    const timer = setInterval(async () => {
      tries += 1;
      try {
        await fetchOrder({ silent: true });
      } catch {
        // ignore
      }
      if (tries >= maxTries) clearInterval(timer);
    }, 5000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.payment_method, order?.payment_status]);

  // ✅ download invoice function (PDF blob)
  async function handleDownloadInvoice() {
    try {
      setDownloading(true);
      setDownloadError("");

      if (!token) throw new Error("Please login first.");

      const invoiceUrl = `http://127.0.0.1:8000/api/orders/my/${orderId}/invoice/`;

      const res = await axios.get(invoiceUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const filename =
        order?.order_number
          ? `invoice-${order.order_number}.pdf`
          : `invoice-order-${orderId}.pdf`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to download invoice."
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleRefreshPayment() {
    try {
      setRefreshing(true);
      await fetchOrder({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="text-lg font-semibold">Loading your order…</div>
          <div className="text-sm text-gray-600 mt-1">Please wait a moment.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="text-lg font-semibold text-red-600">
            Couldn’t load order
          </div>
          <div className="text-sm text-gray-700 mt-2">{error}</div>

          <div className="flex gap-3 mt-6">
            <Link
              to="/"
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
            >
              Go Home
            </Link>
            <Link
              to="/my-orders"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = order?.items || [];

  const paymentMethod = String(order?.payment_method || "").toLowerCase();
  const paymentStatus = String(order?.payment_status || "").toLowerCase();
  const isOnline = paymentMethod === "sslcommerz";
  const isPaid = paymentStatus === "paid";

  return (
    <div className="min-h-[70vh] bg-[#f5f7fb]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Success Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
            ✅ Order placed successfully
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap mt-3">
            <div>
              <h1 className="text-2xl font-bold">Thank you for your order!</h1>
              <p className="text-gray-600 mt-1">
                Your order has been received and is now being processed.
              </p>

              {/* ✅ Payment info (minimal add) */}
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <div>
                  <span className="text-gray-500">Payment Method:</span>{" "}
                  <span className="font-medium">
                    {paymentMethod ? cap(paymentMethod) : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500">Payment Status:</span>{" "}
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      isPaid
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-yellow-50 border-yellow-200 text-yellow-700"
                    }`}
                  >
                    {paymentStatus ? cap(paymentStatus) : "—"}
                  </span>
                </div>
              </div>

              {/* ✅ Online payment guidance */}
              {isOnline && !isPaid && (
                <div className="mt-3 p-3 rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-800 text-sm">
                  Online payment is being confirmed. If you just completed payment,
                  please wait a few seconds and refresh the status.
                  <div className="mt-2">
                    <button
                      onClick={handleRefreshPayment}
                      disabled={refreshing}
                      className={`px-3 py-2 rounded-lg text-white ${
                        refreshing
                          ? "bg-yellow-400 cursor-not-allowed"
                          : "bg-yellow-600 hover:bg-yellow-700"
                      }`}
                    >
                      {refreshing ? "Refreshing..." : "Refresh Payment Status"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">Order ID</div>
              <div className="text-lg font-semibold">
                #{order?.id ?? orderId}
              </div>

              <div className="mt-2 text-sm text-gray-500">Status</div>
              <div className="inline-flex mt-1 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium capitalize">
                {order?.status}
              </div>
            </div>
          </div>

          {/* ✅ Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
            >
              Continue Shopping
            </Link>

            <button
              onClick={handleDownloadInvoice}
              disabled={downloading}
              className={`px-4 py-2 rounded-xl text-white ${
                downloading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {downloading ? "Downloading…" : "Download Invoice (PDF)"}
            </button>

            <Link
              to="/my-orders"
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 bg-white"
            >
              View My Orders
            </Link>
          </div>

          {downloadError ? (
            <div className="mt-3 text-sm text-red-600">{downloadError}</div>
          ) : null}
        </div>

        {/* ✅ Order Status Timeline */}
        {Array.isArray(order?.status_history) &&
          order.status_history.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Order Progress</h2>
              <OrderStatusTimeline history={order.status_history} />
            </div>
          )}

        {/* Items + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Items */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Items</h2>

            <div className="mt-4 divide-y">
              {items.map((it) => (
                <div key={it.id} className="py-4 flex gap-4">
                  <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                    {it.product_image ? (
                      <img
                        src={it.product_image}
                        alt={it.product_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold">{it.product_title}</div>
                    <div className="text-sm text-gray-600">
                      Qty: {it.quantity}
                    </div>
                  </div>

                  <div className="font-semibold">
                    ৳{Number(it.line_total).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            <div className="mt-4 flex justify-between text-sm">
              <span>Total</span>
              <span className="font-semibold">
                ৳{Number(order?.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
