import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";

export default function VendorOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/orders/vendor/orders/${id}/`);
      setOrder(res.data);
    } catch (e) {
      console.error(e);
      setError("Failed to load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = `Vendor Order #${id}`;
    loadOrder();
  }, [id]);

  if (loading) return <div className="p-6">Loading order…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!order) return <div className="p-6">Order not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Order #{order.order_number || order.id}
        </h1>

        <Link
          to="/vendor/orders"
          className="px-4 py-2 rounded-xl border bg-white text-sm hover:bg-gray-50"
        >
          ← Back to Orders
        </Link>
      </div>

      <div className="bg-white border rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-slate-500">Status</div>
          <div className="font-medium capitalize">{order.status}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Payment</div>
          <div className="font-medium capitalize">
            {order.payment_status || "—"}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Total</div>
          <div className="font-medium">৳{order.total}</div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Placed</div>
          <div className="font-medium">
            {order.created_at ? new Date(order.created_at).toLocaleString() : "—"}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h2 className="font-semibold mb-2">Customer</h2>
        <div className="text-sm text-slate-700 space-y-1">
          <div>{order.shipping_name}</div>
          <div>{order.phone}</div>
          <div>
            {order.address}, {order.city}
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Your Items</h2>

        <div className="space-y-3">
          {(order.items || []).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 border-b pb-3 last:border-0"
            >
              {item.product_image && (
                <img
                  src={item.product_image}
                  alt=""
                  className="w-14 h-14 object-cover rounded border"
                />
              )}

              <div className="flex-1">
                <div className="font-medium">{item.product_title}</div>
                <div className="text-xs text-slate-500">
                  ৳{item.price} × {item.quantity}
                </div>
              </div>

              <div className="font-semibold">৳{item.subtotal}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
