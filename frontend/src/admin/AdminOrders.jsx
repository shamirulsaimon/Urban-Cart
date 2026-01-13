import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import AdminOrderDetailModal from "./components/AdminOrderDetailModal";

const STATUSES = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "refunded", label: "Refunded" },
];

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : v;
}

function StatusPill({ status }) {
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

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState(""); // what user types
  const [searchQuery, setSearchQuery] = useState(""); // applied search
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ✅ details modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / pageSize)),
    [count]
  );

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line
  }, [status, page, searchQuery]);

  async function fetchOrders() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/admin/orders/", {
        params: {
          page,
          page_size: pageSize,
          status: status || undefined,
          search: searchQuery || undefined,
        },
      });

      const list = res.data.results || res.data.items || [];
      setOrders(list);
      setCount(res.data.count || 0);
    } catch (e) {
      console.error(e);
      setError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  function onSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  }

  function onClear() {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }

  // ✅ open modal
  function openDetails(orderId) {
    setDetailOrderId(orderId);
    setDetailOpen(true);
  }

  // ✅ allow modal status update to refresh row without refetch
  function onStatusUpdated(orderId, updated) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: updated.status ?? o.status,
              payment_status: updated.payment_status ?? o.payment_status,
            }
          : o
      )
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <button
            onClick={fetchOrders}
            className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setStatus(s.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                status === s.key
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by order ID / order number / customer"
            className="w-full rounded-lg border px-3 py-2"
          />
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-white">
            Search
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg bg-white border border-gray-200 px-4 py-2"
          >
            Clear
          </button>
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-x-auto">
          {loading ? (
            <div className="p-4">Loading…</div>
          ) : error ? (
            <div className="p-4 text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-4 text-gray-600">No orders found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Order #</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((o) => {
                  const previewTitle = o.first_item_title || null;
                  const previewImg = o.first_item_image || null;

                  const itemsCount =
                    typeof o.items_count === "number" ? o.items_count : null;

                  return (
                    <tr key={o.id} className="border-t align-top">
                      <td className="px-4 py-3">{o.id}</td>
                      <td className="px-4 py-3">{o.order_number || "-"}</td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {o.customer_name || o.shipping_name || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {o.customer_email || o.user_email || ""}
                        </div>
                      </td>

                      {/* Items preview */}
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {previewImg ? (
                              <img
                                src={previewImg}
                                alt={previewTitle || "Product"}
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

                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 break-words">
                              {previewTitle ||
                                (itemsCount ? `${itemsCount} item(s)` : "—")}
                            </div>
                            {itemsCount && itemsCount > 1 ? (
                              <div className="text-xs text-gray-500">
                                + {itemsCount - 1} more item(s)
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                {itemsCount ? `${itemsCount} item(s)` : "—"}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ✅ Status: pill only (dropdown removed) */}
                      <td className="px-4 py-3">
                        <StatusPill status={o.status} />
                      </td>

                      <td className="px-4 py-3 capitalize">
                        {o.payment_status || "-"}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        ৳{money(o.total)}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetails(o.id)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 bg-white"
            >
              Prev
            </button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 bg-white"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Order Detail Modal (includes timeline + images + status history) */}
      <AdminOrderDetailModal
        open={detailOpen}
        orderId={detailOrderId}
        onClose={() => {
          setDetailOpen(false);
          setDetailOrderId(null);
        }}
        onStatusUpdated={onStatusUpdated}
      />
    </div>
  );
}
