import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";

function Badge({ variant = "gray", children }) {
  const map = {
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  };
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${map[variant]}`}
    >
      {children}
    </span>
  );
}

export default function PaymentSelect() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const orderId = sp.get("orderId");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState(null);

  const paymentStatus = (order?.payment_status || "").toLowerCase();
  const isPaid = paymentStatus === "paid";

  useEffect(() => {
    let alive = true;

    async function load() {
      setErr("");

      if (!orderId) {
        setErr("Missing orderId.");
        setLoading(false);
        return;
      }

      try {
        // baseURL already has /api
        const res = await api.get(`/orders/my/${orderId}/`);
        if (alive) setOrder(res.data);
      } catch (e) {
        if (alive) setErr(e?.response?.data?.detail || "Failed to load order.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (loading) return <div className="max-w-3xl mx-auto p-6">Loading...</div>;

  if (err) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="p-3 rounded bg-red-50 text-red-600">{err}</div>
      </div>
    );
  }

  const total = Number(order?.total || 0);
  const shipping = Number(order?.shipping_fee || 0);
  const subtotal = Number(order?.subtotal || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Select Payment Method</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => nav("/my-orders")}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="blue">Demo Payment</Badge>
        <Badge variant={isPaid ? "green" : "yellow"}>
          {isPaid ? "Paid" : "Unpaid"}
        </Badge>
      </div>

      <div className="bg-white border rounded-2xl p-5 mt-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-500">Order</div>
            <div className="font-semibold">
              {order?.order_number || `#${orderId}`}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Subtotal</div>
            <div className="font-semibold">৳ {subtotal.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500">Shipping</div>
            <div className="font-semibold">৳ {shipping.toFixed(2)}</div>
          </div>
          <div className="sm:col-span-3 border-t pt-3 flex justify-between">
            <span className="text-gray-600 font-medium">Total</span>
            <span className="text-xl font-semibold">৳ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500 leading-relaxed">
          ⚠ This is a demo payment system for academic project show only. OTP will
          be sent to your login email.
        </div>
      </div>

      {isPaid ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="font-semibold text-green-800">This order is already paid.</div>
          <div className="text-sm text-green-700 mt-1">
            You can view details from My Orders.
          </div>
          <button
            onClick={() => nav(`/order-success/${orderId}`)}
            className="mt-4 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            View Order
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() =>
              nav(`/payment/bkash?orderId=${encodeURIComponent(orderId)}`)
            }
            className="p-5 rounded-2xl border bg-white hover:bg-gray-50 text-left"
          >
            <div className="text-lg font-semibold">bKash (Demo)</div>
            <div className="text-sm text-gray-600 mt-1">
              Pay using phone number + OTP verification
            </div>
          </button>

          <button
            onClick={() =>
              nav(`/payment/card?orderId=${encodeURIComponent(orderId)}`)
            }
            className="p-5 rounded-2xl border bg-white hover:bg-gray-50 text-left"
          >
            <div className="text-lg font-semibold">Card (Demo)</div>
            <div className="text-sm text-gray-600 mt-1">
              Pay using card info + OTP verification
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
