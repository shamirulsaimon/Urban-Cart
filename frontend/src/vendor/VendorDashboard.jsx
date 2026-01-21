import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

async function downloadExcel(path, filename) {
  try {
    const res = await api.get(path, { responseType: "blob" });
    downloadBlob(res.data, filename);
  } catch (e) {
    console.error(e);
    alert("Download failed. Please login again.");
  }
}

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n) {
  const x = toNumber(n);
  return `৳ ${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function normalizeSummary(raw) {
  const s = raw || {};

  // ✅ support camelCase & snake_case
  return {
    products: s.products ?? s.active_products ?? 0,

    totalOrders:
      s.totalOrders ??
      s.total_orders ??
      s.orders ??
      0,

    byStatus:
      s.byStatus ??
      s.by_status ??
      s.status_counts ??
      {},

    revenueTotal:
      s.revenueTotal ??
      s.revenue_total ??
      s.total_revenue ??
      s.revenue ??
      0,

    monthlySales:
      s.monthlySales ??
      s.monthly_sales ??
      s.monthly ??
      [],

    topProducts:
      s.topProducts ??
      s.top_products ??
      s.top_selling_products ??
      [],
  };
}

function MonthlyBarChart({ data = [] }) {
  const rows = useMemo(() => {
    const safe = Array.isArray(data) ? data : [];
    return safe.slice(-12);
  }, [data]);

  const max = useMemo(() => {
    return Math.max(0, ...rows.map((d) => toNumber(d?.revenue || d?.amount || 0)));
  }, [rows]);

  if (!rows.length || max <= 0) {
    return <div className="text-sm text-slate-600">No monthly sales data yet.</div>;
  }

  const W = 860;
  const H = 240;
  const PAD_L = 52;
  const PAD_R = 20;
  const PAD_T = 18;
  const PAD_B = 44;

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const n = rows.length;
  const gap = 10;
  const barW = Math.max(10, (innerW - gap * (n - 1)) / n);

  const yFor = (value) => PAD_T + innerH - (value / max) * innerH;

  const ticks = [0.25, 0.5, 0.75, 1].map((t) => ({
    y: yFor(max * t),
    v: max * t,
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        {ticks.map((t) => (
          <g key={t.y}>
            <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="#E5E7EB" strokeWidth="1" />
            <text x={PAD_L - 10} y={t.y + 4} textAnchor="end" fontSize="11" fill="#64748B">
              {Math.round(t.v).toLocaleString()}
            </text>
          </g>
        ))}

        <line
          x1={PAD_L}
          y1={PAD_T + innerH}
          x2={W - PAD_R}
          y2={PAD_T + innerH}
          stroke="#CBD5E1"
          strokeWidth="1"
        />

        {rows.map((d, i) => {
          const revenue = toNumber(d?.revenue ?? d?.amount ?? 0);
          const h = (revenue / max) * innerH;

          const x = PAD_L + i * (barW + gap);
          const y = PAD_T + innerH - h;

          const label = String(d?.month || d?.label || "");
          const short = label
            ? new Date(label + "-01").toLocaleString(undefined, { month: "short" })
            : "";

          return (
            <g key={`${label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                rx="10"
                fill="#0EA5E9"
                opacity="0.85"
              />

              {h > 26 && (
                <text
                  x={x + barW / 2}
                  y={Math.max(y + 16, 24)}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#FFFFFF"
                >
                  {Math.round(revenue).toLocaleString()}
                </text>
              )}

              <text x={x + barW / 2} y={H - 18} textAnchor="middle" fontSize="11" fill="#64748B">
                {short || "—"}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        <span>
          <span className="font-medium text-gray-900">Max:</span> {formatMoney(max)}
        </span>
        <span>Bars represent vendor revenue per month (last 12 months).</span>
      </div>
    </div>
  );
}

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  async function loadSummary() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/orders/vendor/dashboard/summary/");
      setSummary(normalizeSummary(res.data));
    } catch (e) {
      console.error(e);
      setError("Failed to load vendor dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Vendor Dashboard • Urban Cart";
    loadSummary();
  }, []);

  const products = summary?.products ?? 0;
  const totalOrders = summary?.totalOrders ?? 0;
  const byStatus = summary?.byStatus ?? {};
  const revenueTotal = summary?.revenueTotal ?? 0;
  const monthlySales = summary?.monthlySales ?? [];
  const topProducts = summary?.topProducts ?? [];

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Vendor Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Manage your products and track orders containing your items.
            </p>
          </div>

        <div className="flex gap-2">
             <Link
  to="/vendor/products"
  className="
    rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white
    transition-all duration-200
    hover:bg-black hover:shadow-md hover:-translate-y-[1px]
    active:translate-y-0
  "
>
  Products
</Link>

<Link
  to="/vendor/categories"
  className="
    rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900
    border border-gray-200
    transition-all duration-200
    hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm hover:-translate-y-[1px]
    active:translate-y-0
  "
>
  Categories
</Link>


              <Link
                to="/vendor/orders"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Orders
              </Link>
            </div>

        </div>

        {error && (
          <div className="bg-white border border-rose-200 text-rose-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Active Products</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{loading ? "…" : products}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Total Orders (yours)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{loading ? "…" : totalOrders}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Revenue (vendor-only)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : formatMoney(revenueTotal)}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : (byStatus.pending ?? 0)}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Delivered</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : (byStatus.delivered ?? 0)}
            </p>
          </div>
        </div>

        {/* Monthly sales graph */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Sales</h2>

            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-600">Vendor-only revenue per month</div>

              <button
                onClick={() =>
                  downloadExcel("/orders/vendor/reports/sales-monthly.xlsx", "vendor_sales_monthly.xlsx")
                }
                className="ml-3 rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                Download Monthly Excel
              </button>

              <button
                onClick={() => downloadExcel("/orders/vendor/reports/sales.xlsx", "vendor_sales_overall.xlsx")}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                Download Overall Excel
              </button>
            </div>
          </div>

          <div className="mt-4 text-gray-900">
            {loading ? (
              <div className="text-sm text-slate-600">Loading chart…</div>
            ) : (
              <MonthlyBarChart data={monthlySales} />
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Top-selling Products</h2>
            <Link to="/vendor/products" className="text-sm text-sky-700 hover:underline">
              View all
            </Link>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-slate-600">Loading top products…</div>
            ) : topProducts.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topProducts.map((p) => (
                  <div key={p.product_id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 text-xs">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          "IMG"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          Units: <span className="font-medium text-gray-900">{toNumber(p.units)}</span>
                          {" · "}
                          Revenue: <span className="font-medium text-gray-900">{formatMoney(p.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                No sales yet. Once customers buy your products, they’ll appear here.
              </div>
            )}
          </div>
        </div>

        {/* Status overview */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Orders by Status</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
              <div key={s} className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs text-slate-600 capitalize">{s}</div>
                <div className="mt-2 text-xl font-semibold text-gray-900">
                  {loading ? "…" : (byStatus[s] ?? 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
