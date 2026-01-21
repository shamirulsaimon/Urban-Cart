import { useEffect, useMemo, useState } from "react";
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

function money(v) {
  if (v === null || v === undefined) return "0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toFixed(2);
}

function cap(s) {
  if (!s) return "—";
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

// ✅ robust title getter
function getItemTitle(x) {
  if (!x) return "Item";
  return (
    x.product_title ||
    x.productTitle ||
    x.product_name ||
    x.productName ||
    x.name ||
    x.title ||
    x.product?.title ||
    x.product?.name ||
    "Item"
  );
}

// ✅ robust image getter
function getItemImage(x) {
  if (!x) return null;
  return (
    x.product_image ||
    x.productImage ||
    x.image ||
    x.product?.image ||
    x.product?.image_url ||
    x.product?.imageUrl ||
    null
  );
}

function StatusPill({ value }) {
  const v = (value || "").toLowerCase();
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full border text-xs bg-white">
      {cap(v)}
    </span>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ✅ Extract backend error detail nicely
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

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ NEW: search query state
  const [q, setQ] = useState("");

  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [statusForm, setStatusForm] = useState({ status: "", note: "" });

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/orders/vendor/orders/");
      const data = res.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];

      setOrders(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load vendor orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function openOrder(id) {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");
    setSaveMsg("");
    setSaveErr("");

    try {
      const res = await api.get(`/orders/vendor/orders/${id}/`);
      setDetail(res.data);

      const current = (res.data?.status || "").toLowerCase();
      setStatusForm({ status: current || "pending", note: "" });
    } catch (e) {
      console.error(e);
      setDetailError("Failed to load order details.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setOpenId(null);
    setDetail(null);
    setDetailError("");
    setSaveMsg("");
    setSaveErr("");
    setSaving(false);
  }

  // ✅ Build rows: show ALL item names in the table
  const orderRows = useMemo(() => {
    return orders.map((o) => {
      const items = Array.isArray(o.items) ? o.items : [];

      const itemTitles = items.map((it) => getItemTitle(it)).filter(Boolean);

      return {
        id: o.id,
        order_number: o.order_number || `UC-${String(o.id).padStart(6, "0")}`,
        customer_name: o.shipping_name || o.customer_name || o.user_name || "—",
        customer_email: o.customer_email || o.user_email || o.email || "",
        status: o.status,
        payment_status: o.payment_status,
        total: o.total,
        item_count: items.length,

        // ✅ NEW
        item_titles: itemTitles,
        first_image: getItemImage(items[0]),
      };
    });
  }, [orders]);

  // ✅ NEW: filtered rows by search
  const filteredRows = useMemo(() => {
    const needle = (q || "").trim().toLowerCase();
    if (!needle) return orderRows;

    return orderRows.filter((o) => {
      const hay = [
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.status,
        o.payment_status,
        (o.item_titles || []).join(", "),
        String(o.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [orderRows, q]);

  const allowedNext = useMemo(() => {
    const v =
      detail?.allowed_next_statuses ||
      detail?.allowedNextStatuses ||
      detail?.allowed_next_steps ||
      null;

    if (Array.isArray(v) && v.length) return v.map((x) => String(x).toLowerCase());
    return ALL_STATUSES;
  }, [detail]);

  const currentStatus = useMemo(
    () => (detail?.status || "").toLowerCase(),
    [detail]
  );

  const isSelectedAllowed = useMemo(() => {
    const s = (statusForm.status || "").toLowerCase();
    if (!s) return false;
    return allowedNext.includes(s) || s === currentStatus;
  }, [statusForm.status, allowedNext, currentStatus]);

  const noteRequired = useMemo(() => {
    const s = (statusForm.status || "").toLowerCase();
    return s === "cancelled" || s === "refunded";
  }, [statusForm.status]);

  const canSave = useMemo(() => {
    if (!detail?.id) return false;
    if (saving) return false;

    const next = (statusForm.status || "").toLowerCase();
    if (!next) return false;

    if (!isSelectedAllowed) return false;

    // prevent no-op without note
    if (next === currentStatus && !(statusForm.note || "").trim()) return false;

    if (noteRequired && !(statusForm.note || "").trim()) return false;

    return true;
  }, [
    detail?.id,
    saving,
    statusForm.status,
    statusForm.note,
    isSelectedAllowed,
    currentStatus,
    noteRequired,
  ]);

  async function saveStatus() {
    if (!detail?.id) return;
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

      const payload = { status: next, note };
      await api.patch(`/orders/vendor/orders/${detail.id}/`, payload);

      setSaveMsg("Status updated ✅");

      await openOrder(detail.id);
      await loadOrders();
    } catch (e) {
      console.error(e);
      setSaveErr(getApiErrorMessage(e) || "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    document.title = "Vendor Orders • Urban Cart";
    loadOrders();
  }, []);

  const timeline = useMemo(() => {
    const raw =
      detail?.status_history || detail?.status_timeline || detail?.history || [];
    if (Array.isArray(raw) && raw.length) return raw;

    const createdAt = detail?.created_at || detail?.createdAt;
    const current = detail?.status;

    const items = [];
    if (createdAt) {
      items.push({
        status: "pending",
        changed_at: createdAt,
        note: "Order created",
        changed_by: detail?.user_id || detail?.user || null,
      });
    }
    if (current) {
      items.push({
        status: current,
        changed_at: detail?.updated_at || detail?.updatedAt || createdAt || null,
        note: "",
        changed_by: null,
      });
    }
    return items;
  }, [detail]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">My Orders</h1>
            <p className="mt-2 text-slate-600">Orders containing your products only.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* ✅ NEW: Search bar */}
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search orders: order#, customer, status, item…"
                className="w-full sm:w-[360px] px-4 py-3 rounded-2xl border bg-white outline-none focus:ring-2 focus:ring-slate-200"
              />
              {q ? (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 text-sm"
                  title="Clear"
                >
                  ✕
                </button>
              ) : null}
            </div>

            <button
              onClick={loadOrders}
              className="px-6 py-3 rounded-2xl border bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-white border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-slate-600 border-b">
                  <th className="py-4 px-5">Order #</th>
                  <th className="py-4 px-5">Customer</th>
                  <th className="py-4 px-5">Items</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Payment</th>
                  <th className="py-4 px-5">Total</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-10 px-5 text-slate-600" colSpan={7}>
                      Loading…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="py-10 px-5 text-slate-600" colSpan={7}>
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-5 px-5 font-medium">{o.order_number}</td>

                      <td className="py-5 px-5">
                        <div className="font-medium">{o.customer_name}</div>
                        {o.customer_email ? (
                          <div className="text-xs text-slate-500">{o.customer_email}</div>
                        ) : null}
                      </td>

                      {/* ✅ Items column: show ALL item names */}
                      <td className="py-5 px-5">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-2xl border bg-gray-50 overflow-hidden flex items-center justify-center">
                            {o.first_image ? (
                              <img
                                src={o.first_image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="text-xs text-slate-400">No image</div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 line-clamp-2 max-w-[360px]">
                              {o.item_titles && o.item_titles.length
                                ? o.item_titles.join(", ")
                                : "—"}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {o.item_count} item{o.item_count > 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 px-5">
                        <StatusPill value={o.status} />
                      </td>

                      <td className="py-5 px-5">{cap(o.payment_status)}</td>

                      <td className="py-5 px-5 font-semibold">৳{money(o.total)}</td>

                      <td className="py-5 px-5 text-right">
                        <button
                          onClick={() => openOrder(o.id)}
                          className="px-5 py-2 rounded-2xl border bg-white hover:bg-gray-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ NEW: footer hint */}
          <div className="px-5 py-3 border-t text-xs text-slate-600 bg-white">
            Showing <span className="font-medium text-slate-900">{filteredRows.length}</span> of{" "}
            <span className="font-medium text-slate-900">{orderRows.length}</span> orders
            {q ? (
              <>
                {" "}
                for search “<span className="font-medium text-slate-900">{q}</span>”
              </>
            ) : null}
          </div>
        </div>

        <Modal open={Boolean(openId)} onClose={closeModal}>
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                Order #{detail?.order_number || openId}
              </h2>
              {detail?.status ? <StatusPill value={detail.status} /> : null}
            </div>

            <button
              onClick={closeModal}
              className="px-5 py-2 rounded-2xl border bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          <div className="p-6 bg-[#f5f7fb] max-h-[80vh] overflow-y-auto">

            {detailLoading ? (
              <div className="p-6 bg-white rounded-2xl border">Loading order…</div>
            ) : detailError ? (
              <div className="p-6 bg-white rounded-2xl border text-rose-600">
                {detailError}
              </div>
            ) : !detail ? (
              <div className="p-6 bg-white rounded-2xl border">No data.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border rounded-2xl p-6 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">Customer</div>
                      <div className="mt-2 font-medium">
                        {detail.customer_name || detail.shipping_name || "—"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {detail.customer_email || detail.email || ""}
                      </div>
                      <div className="mt-3 text-sm text-slate-600">
                        {detail.phone ? detail.phone : ""}
                        {detail.city ? ` • ${detail.city}` : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold">Total</div>
                      <div className="mt-2 text-2xl font-bold">৳{money(detail.total)}</div>
                      <div className="text-sm text-slate-500">
                        Payment: {cap(detail.payment_status)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-2xl p-6">
                    <div className="text-sm font-semibold mb-4">Items</div>

                    <div className="space-y-4">
                      {(detail.items || []).map((it) => (
                        <div key={it.id} className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl border bg-gray-50 overflow-hidden flex items-center justify-center">
                            {getItemImage(it) ? (
                              <img
                                src={getItemImage(it)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="text-xs text-slate-400">No image</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900">{getItemTitle(it)}</div>
                            <div className="text-sm text-slate-500">
                              Qty: {it.quantity} • Price: ৳{money(it.price)}
                            </div>
                          </div>

                          <div className="font-semibold">
                            ৳
                            {money(
                              it.subtotal ??
                                Number(it.price || 0) * Number(it.quantity || 0)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Status Timeline</div>
                      <div className="text-sm text-slate-500">{timeline.length} updates</div>
                    </div>

                    <div className="mt-4 space-y-5">
                      {timeline.map((t, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="mt-1 h-3 w-3 rounded-full border" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {cap(t.status)}
                              {t.changed_at ? (
                                <span className="ml-2 text-sm text-slate-500">
                                  {new Date(t.changed_at).toLocaleString()}
                                </span>
                              ) : null}
                            </div>

                            {t.changed_by ? (
                              <div className="text-sm text-slate-500">
                                Changed by: {t.changed_by}
                              </div>
                            ) : null}

                            {t.note ? (
                              <div className="mt-2 bg-slate-50 border rounded-xl p-3 text-sm text-slate-700">
                                {t.note}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ✅ Update Status card */}
                  
                  <div className="bg-white border rounded-2xl p-6 overflow-visible">
                    <div className="text-sm font-semibold mb-4">Update Status</div>

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
                      className="w-full border rounded-2xl px-4 py-3 bg-white mt-3 h-[110px] resize-none"
                      placeholder={
                        noteRequired ? "Note is required for cancelled/refunded" : "Optional note"
                      }
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
                      type="button"
                      onClick={saveStatus}
                      className="
                        relative z-10 w-full mt-4 px-5 py-3 rounded-2xl
                        bg-primary text-white font-medium
                        transition-all duration-200 ease-in-out
                        hover:bg-primary/90 hover:shadow-lg hover:-translate-y-[1px]
                        active:bg-primary/80 active:translate-y-0
                        focus:outline-none focus:ring-2 focus:ring-primary/40
                      "
                    >
                      Update Status
                    </button>

                  </div>

                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
