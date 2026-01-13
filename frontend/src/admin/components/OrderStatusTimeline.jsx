// src/admin/components/OrderStatusTimeline.jsx
import React from "react";

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(); // uses browser locale
}

// Accepts multiple possible backend shapes safely
function normalizeHistoryItem(item) {
  // common variants:
  // changed_at | changedAt | created_at | timestamp
  const changedAt =
    item?.changed_at ??
    item?.changedAt ??
    item?.created_at ??
    item?.timestamp ??
    item?.createdAt ??
    null;

  // changed_by | changedBy | admin_email | user_email | by_email
  const changedBy =
    item?.changed_by ??
    item?.changedBy ??
    item?.admin_email ??
    item?.by_email ??
    item?.changed_by_email ??
    item?.changed_by_user_email ??
    item?.changed_by_user?.email ??
    item?.changed_by_user?.username ??
    null;

  return {
    status: item?.status ?? "",
    changed_at: changedAt,
    note: item?.note ?? item?.message ?? item?.reason ?? "",
    changed_by: changedBy,
  };
}

function getStatusTone(status) {
  // Tailwind “tone” choices (no fancy deps)
  // You can adjust later, but this already looks clean.
  if (status === "delivered") return "bg-green-600";
  if (status === "shipped") return "bg-indigo-600";
  if (status === "processing") return "bg-purple-600";
  if (status === "confirmed") return "bg-blue-600";
  if (status === "cancelled") return "bg-red-600";
  if (status === "refunded") return "bg-orange-600";
  return "bg-yellow-500"; // pending / default
}

export default function OrderStatusTimeline({ history = [], showChangedBy = false }) {
  const normalized = Array.isArray(history)
    ? history.map(normalizeHistoryItem)
    : [];

  if (!normalized.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="font-semibold text-gray-900">Status Timeline</div>
        <div className="mt-2 text-sm text-gray-600">No history available.</div>
      </div>
    );
  }

  // Sort oldest → newest for “timeline”
  const sorted = [...normalized].sort((a, b) => {
    const ta = a.changed_at ? new Date(a.changed_at).getTime() : 0;
    const tb = b.changed_at ? new Date(b.changed_at).getTime() : 0;
    return ta - tb;
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-900">Status Timeline</div>
        <div className="text-xs text-gray-500">
          {sorted.length} update{sorted.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {sorted.map((h, idx) => {
          const isLast = idx === sorted.length - 1;
          const tone = getStatusTone(h.status);
          const label = STATUS_LABEL[h.status] || h.status || "Unknown";

          return (
            <div key={`${h.status}-${h.changed_at}-${idx}`} className="flex gap-3">
              {/* left rail */}
              <div className="flex flex-col items-center">
                <div className={`h-3 w-3 rounded-full ${tone}`} />
                {!isLast && <div className="mt-1 w-px flex-1 bg-gray-200" />}
              </div>

              {/* content */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="text-sm font-semibold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(h.changed_at)}</div>
                </div>

                {( (showChangedBy && h.changed_by) || h.note) && (
                  <div className="mt-1 text-sm text-gray-700">
                    {showChangedBy && h.changed_by && (
                      <div className="text-xs text-gray-600">
                        Changed by: <span className="font-medium">{h.changed_by}</span>
                      </div>
                    )}
                    {h.note && (
                      <div className="mt-1 rounded-lg bg-gray-50 p-2 text-sm text-gray-800">
                        {h.note}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
