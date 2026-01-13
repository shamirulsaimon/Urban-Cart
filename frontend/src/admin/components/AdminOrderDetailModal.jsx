import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import OrderStatusTimeline from "./OrderStatusTimeline";

// ✅ Business rules: allowed transitions
const STATUS_FLOW = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : v;
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function StatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  const base =
    "inline-flex px-3 py-1 rounded-full text-xs font-semibold border capitalize";
  const styles = {
    pending: "bg-gray-50 text-gray-700 border-gray-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-yellow-50 text-yellow-700 border-yellow-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    refunded: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return <span className={`${base} ${styles[s] || styles.pending}`}>{s}</span>;
}

// ✅ All statuses (always visible in dropdown)
const STATUS_OPTIONS = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "refunded", label: "Refunded" },
];

export default function AdminOrderDetailModal({
  open,
  orderId,
  onClose,
  onStatusUpdated, // optional callback to refresh list row
}) {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !orderId) return;

    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/admin/orders/${orderId}/`);
        if (!alive) return;
        setOrder(res.data);

        const initial = (res.data?.status || "pending").toLowerCase();
        setNextStatus(initial);
        setNote("");
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError("Failed to load order details.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [open, orderId]);

  const currentStatus = (order?.status || "pending").toLowerCase();

  // ✅ Only allow transitions by rules (used for validation + helper text)
  const allowedNext = useMemo(
    () => STATUS_FLOW[currentStatus] || [],
    [currentStatus]
  );

  // ✅ Show ALL statuses in the dropdown (as you requested),
  // but keep validation on save (so you can't jump illegally).
  const selectOptions = useMemo(() => {
    // Ensure current status exists (even if backend ever returns an unexpected string)
    const hasCurrent = STATUS_OPTIONS.some((x) => x.key === currentStatus);
    if (hasCurrent) return STATUS_OPTIONS;

    return [{ key: currentStatus, label: currentStatus }, ...STATUS_OPTIONS];
  }, [currentStatus]);

  // If current status changes after load (rare), keep selection valid
  useEffect(() => {
    if (!nextStatus) return;
    // keep chosen in sync if backend updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatus]);

  async function saveStatus() {
    if (!orderId || !nextStatus) return;

    const chosen = nextStatus.toLowerCase();

    // ✅ hard block invalid transitions (extra safety)
    if (chosen !== currentStatus && !allowedNext.includes(chosen)) {
      window.alert(`Invalid transition: ${currentStatus} → ${chosen}`);
      return;
    }

    // Require a note for cancelled/refunded
    if ((chosen === "cancelled" || chosen === "refunded") && !note.trim()) {
      window.alert("Please provide a note/reason for Cancelled or Refunded.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await api.patch(`/admin/orders/${orderId}/`, {
        status: chosen,
        note: note.trim() || undefined,
      });

      const updated = res.data;

      setOrder((prev) => ({
        ...(prev || {}),
        ...updated,
        status: (updated.status ?? chosen).toLowerCase(),
      }));

      // Let AdminOrders update the row without refetching everything
      if (onStatusUpdated) onStatusUpdated(orderId, updated);

      setNote("");
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "Failed to update order.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const items = order?.items || [];
  const history = order?.status_history || order?.history || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-gray-900">
              Order #{order?.order_number || order?.id || orderId}
            </div>
            <StatusBadge status={order?.status} />
          </div>

          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading…</div>
          ) : error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
              {error}
            </div>
          ) : !order ? (
            <div className="py-10 text-center text-gray-500">No order found.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Left: Details */}
              <div className="lg:col-span-2 space-y-4">
                {/* Customer / Summary */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Customer
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {order.customer_name || order.shipping_name || "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.customer_email || ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        Total
                      </div>
                      <div className="mt-1 text-lg font-bold text-gray-900">
                        ৳{money(order.total)}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        Payment: {order.payment_status || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">Items</div>

                  <div className="mt-3 divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <div className="py-6 text-sm text-gray-500">No items.</div>
                    ) : (
                      items.map((it, idx) => {
                        const title =
                          it.product_title ||
                          it.name ||
                          `Product #${it.product || idx + 1}`;
                        const img =
                          it.image ||
                          it.product_image ||
                          it.product?.image ||
                          it.product?.images?.[0] ||
                          it.product_images?.[0] ||
                          null;

                        return (
                          <div key={idx} className="py-3 flex items-start gap-3">
                            <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {img ? (
                                <img
                                  src={img}
                                  alt={title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="text-[10px] text-gray-400">
                                  No image
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 break-words">
                                {title}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Qty: {it.quantity} • Price: ৳{money(it.price)}
                              </div>
                            </div>

                            <div className="text-sm font-semibold text-gray-900">
                              ৳
                              {money(
                                (Number(it.price || 0) * Number(it.quantity || 0)) ||
                                  it.line_total
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Timeline + Update */}
              <div className="space-y-4">
                {/* Timeline */}
                <OrderStatusTimeline history={history} showChangedBy />

                {/* Update status */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">
                    Update Status
                  </div>

                  <div className="mt-3 space-y-3">
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                      disabled={saving}
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                    >
                      {selectOptions.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note (required for cancelled/refunded)"
                      disabled={saving}
                      rows={3}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />

                    <button
                      onClick={saveStatus}
                      disabled={saving || !nextStatus}
                      className={cx(
                        "w-full rounded-lg px-4 py-2 text-sm font-medium text-white",
                        saving ? "bg-gray-400" : "bg-gray-900 hover:bg-black"
                      )}
                    >
                      {saving ? "Saving…" : "Save Status"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Allowed next steps:{" "}
                    {allowedNext.length ? allowedNext.join(", ") : "No further actions"}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Tip: Add a note for shipped/delivered like “Dispatched via courier”.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
          Admin Order Detail • Urban Cart
        </div>
      </div>
    </div>
  );
}
