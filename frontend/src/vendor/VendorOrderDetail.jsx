import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";

const ALL_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

function cap(s) {
  if (!s) return "—";
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function getApiErrorMessage(e) {
  const data = e?.response?.data;
  if (!data) return "Request failed.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;

  try {
    return JSON.stringify(data);
  } catch {
    return "Request failed.";
  }
}

export default function VendorOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ NEW: status update form (with save)
  const [statusForm, setStatusForm] = useState({ status: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  async function loadOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/orders/vendor/orders/${id}/`);
      const data = res.data;
      setOrder(data);

      const current = (data?.status || "").toLowerCase();
      setStatusForm({ status: current || "pending", note: "" });
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

  const allowedNext = useMemo(() => {
    const v =
      order?.allowed_next_statuses ||
      order?.allowedNextStatuses ||
      order?.allowed_next_steps ||
      null;

    if (Array.isArray(v) && v.length) return v.map((x) => String(x).toLowerCase());
    return ALL_STATUSES;
  }, [order]);

  const currentStatus = useMemo(() => (order?.status || "").toLowerCase(), [order]);

  const noteRequired = useMemo(() => {
    const s = (statusForm.status || "").toLowerCase();
    return s === "cancelled" || s === "refunded";
  }, [statusForm.status]);

  const isSelectedAllowed = useMemo(() => {
    const s = (statusForm.status || "").toLowerCase();
    if (!s) return false;
    return allowedNext.includes(s) || s === currentStatus;
  }, [statusForm.status, allowedNext, currentStatus]);

  const canSave = useMemo(() => {
    if (!order?.id) return false;
    if (saving) return false;

    const next = (statusForm.status || "").toLowerCase();
    if (!next) return false;

    if (!isSelectedAllowed) return false;

    // prevent no-op without note
    if (next === currentStatus && !(statusForm.note || "").trim()) return false;

    if (noteRequired && !(statusForm.note || "").trim()) return false;

    return true;
  }, [
    order?.id,
    saving,
    statusForm.status,
    statusForm.note,
    isSelectedAllowed,
    currentStatus,
    noteRequired,
  ]);

  async function saveStatus() {
    if (!order?.id) return;

    setSaving(true);
    setSaveMsg("");
    setSaveErr("");

    try {
      const next = (statusForm.status || "").toLowerCase();
      const note = (statusForm.note || "").trim();

      if (!next) {
        setSaveErr("Please select a status.");
        return;
      }
      if (!isSelectedAllowed) {
        setSaveErr("This status is not allowed for this order.");
        return;
      }
      if ((next === "cancelled" || next === "refunded") && !note) {
        setSaveErr("A note is required for cancelled/refunded.");
        return;
      }

      await api.patch(`/orders/vendor/orders/${order.id}/`, { status: next, note });

      setSaveMsg("Status updated ✅");
      await loadOrder();
    } catch (e) {
      console.error(e);
      setSaveErr(getApiErrorMessage(e) || "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading order…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!order) return <div className="p-6">Order not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
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
          <div className="font-medium capitalize">{order.payment_status || "—"}</div>
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

      {/* ✅ NEW: Update Status (with Save button) */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Update Status</h2>

        <select
          className="w-full border rounded-2xl px-4 py-3 bg-white"
          value={statusForm.status}
          onChange={(e) => {
            setSaveMsg("");
            setSaveErr("");
            setStatusForm((s) => ({ ...s, status: e.target.value }));
          }}
        >
          {allowedNext.map((s) => (
            <option key={s} value={s}>
              {cap(s)}
            </option>
          ))}
        </select>

        <textarea
          className="w-full border rounded-2xl px-4 py-3 bg-white mt-3 min-h-[110px]"
          placeholder={noteRequired ? "Note is required for cancelled/refunded" : "Optional note"}
          value={statusForm.note}
          onChange={(e) => {
            setSaveMsg("");
            setSaveErr("");
            setStatusForm((s) => ({ ...s, note: e.target.value }));
          }}
        />

        {!isSelectedAllowed ? (
          <div className="mt-3 text-sm text-rose-700">
            This status is not allowed for this order.
          </div>
        ) : null}

        {noteRequired && !(statusForm.note || "").trim() ? (
          <div className="mt-3 text-sm text-rose-700">
            Note is required for cancelled/refunded.
          </div>
        ) : null}

        {saveMsg ? <div className="mt-3 text-sm text-emerald-700">{saveMsg}</div> : null}
        {saveErr ? (
          <div className="mt-3 text-sm text-rose-700 break-words">{saveErr}</div>
        ) : null}

        <button
          onClick={saveStatus}
          disabled={!canSave}
          className="w-full mt-4 px-5 py-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Status"}
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Your Items</h2>

        <div className="space-y-3">
          {(order.items || []).map((item) => (
            <div key={item.id} className="flex items-center gap-4 border-b pb-3 last:border-0">
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
