import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { downloadBlob } from "../api/client";

function fmtMoneyBDT(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return `৳${value ?? 0}`;
  return `৳${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const [aLoading, setALoading] = useState(true);
  const [aError, setAError] = useState("");
  const [analytics, setAnalytics] = useState(null);

  const [start, setStart] = useState(daysAgoISO(7));
  const [end, setEnd] = useState(todayISO());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    document.title = "Admin Dashboard • Urban Cart";

    let alive = true;

    async function loadSummary() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/admin/dashboard/summary/");
        if (!alive) return;
        setSummary(res.data);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError("Failed to load dashboard summary.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    async function loadAnalytics(params = null) {
      setALoading(true);
      setAError("");
      try {
        const res = await api.get("/admin/orders/analytics/", {
          params: params || undefined,
        });
        if (!alive) return;
        setAnalytics(res.data);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setAError("Failed to load revenue analytics.");
      } finally {
        if (alive) setALoading(false);
      }
    }

    loadSummary();
    loadAnalytics({ start, end });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byStatus = summary?.by_status || {};
  const total = summary?.totalOrders ?? summary?.total_orders ?? 0;
  const pending = summary?.pendingOrders ?? byStatus?.pending ?? 0;
  const shipped = summary?.shippedOrders ?? byStatus?.shipped ?? 0;
  const delivered = summary?.deliveredOrders ?? byStatus?.delivered ?? 0;
  const revenue = summary?.revenue ?? summary?.revenue_delivered ?? 0;

  const todayOrders = analytics?.today?.orders ?? 0;
  const todayRevenueAll = analytics?.today?.revenue_all ?? "0.00";
  const todayRevenuePaid = analytics?.today?.revenue_paid ?? "0.00";

  const monthOrders = analytics?.this_month?.orders ?? 0;
  const monthRevenueAll = analytics?.this_month?.revenue_all ?? "0.00";
  const monthRevenuePaid = analytics?.this_month?.revenue_paid ?? "0.00";

  const rangeOrders = analytics?.range?.orders ?? 0;
  const rangeRevenueAll = analytics?.range?.revenue_all ?? "0.00";
  const rangeRevenuePaid = analytics?.range?.revenue_paid ?? "0.00";
  const tz = analytics?.timezone || "";

  const dailyBreakdown = useMemo(() => {
    const rows = analytics?.range?.daily_breakdown || [];
    return Array.isArray(rows) ? rows : [];
  }, [analytics]);

  async function applyRange() {
    setAError("");
    setALoading(true);
    try {
      const res = await api.get("/admin/orders/analytics/", {
        params: { start, end },
      });
      setAnalytics(res.data);
    } catch (e) {
      console.error(e);
      setAError("Failed to load revenue analytics.");
    } finally {
      setALoading(false);
    }
  }

  async function downloadExcel() {
    setDownloading(true);
    try {
      const qs =
        start && end
          ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
          : "";
      const filename =
        start && end ? `orders-report-${start}-to-${end}.xlsx` : "orders-report.xlsx";
      await downloadBlob(`/admin/orders/export-excel/${qs}`, filename);
    } catch (e) {
      console.error(e);
      setAError("Failed to download Excel report.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
              <span className="font-bold text-sky-700">UC</span>
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="mt-2 text-slate-600">
                Overview of orders, products, and store activity.
              </p>
              {tz && (
                <p className="mt-1 text-xs text-slate-500">
                  Server timezone: <span className="font-medium">{tz}</span>
                </p>
              )}
            </div>
          </div>

          <Link
            to="/admin/orders"
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
          >
            View All Orders
          </Link>
        </div>

        {(error || aError) && (
          <div className="bg-white border border-rose-200 text-rose-700 rounded-xl p-3 text-sm">
            {error || aError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Total Orders</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : total}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : pending}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Shipped</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : shipped}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Delivered Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : `৳${revenue}`}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Revenue & Reports</h2>
              <p className="mt-1 text-sm text-slate-600">
                Daily/monthly revenue, order counts, and Excel report export.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex flex-col">
                <label className="text-xs text-slate-600">Start</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-600">End</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={applyRange}
                disabled={aLoading}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {aLoading ? "Loading…" : "Apply"}
              </button>

              <button
                onClick={downloadExcel}
                disabled={downloading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              >
                {downloading ? "Downloading…" : "Download Excel"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-slate-600">Today</p>
              <p className="mt-2 text-sm text-slate-700">
                Orders: <span className="font-semibold">{aLoading ? "…" : todayOrders}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Revenue (all):{" "}
                <span className="font-semibold">
                  {aLoading ? "…" : fmtMoneyBDT(todayRevenueAll)}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Paid:{" "}
                <span className="font-medium">
                  {aLoading ? "…" : fmtMoneyBDT(todayRevenuePaid)}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-slate-600">This Month</p>
              <p className="mt-2 text-sm text-slate-700">
                Orders: <span className="font-semibold">{aLoading ? "…" : monthOrders}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Revenue (all):{" "}
                <span className="font-semibold">
                  {aLoading ? "…" : fmtMoneyBDT(monthRevenueAll)}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Paid:{" "}
                <span className="font-medium">
                  {aLoading ? "…" : fmtMoneyBDT(monthRevenuePaid)}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-slate-600">Selected Range</p>
              <p className="mt-2 text-sm text-slate-700">
                Orders: <span className="font-semibold">{aLoading ? "…" : rangeOrders}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Revenue (all):{" "}
                <span className="font-semibold">
                  {aLoading ? "…" : fmtMoneyBDT(rangeRevenueAll)}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Paid:{" "}
                <span className="font-medium">
                  {aLoading ? "…" : fmtMoneyBDT(rangeRevenuePaid)}
                </span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-600 border-b border-gray-200">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Orders</th>
                  <th className="py-2 pr-4">Revenue (all)</th>
                  <th className="py-2 pr-4">Revenue (paid)</th>
                </tr>
              </thead>
              <tbody>
                {aLoading ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                ) : dailyBreakdown.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={4}>
                      No data for selected range.
                    </td>
                  </tr>
                ) : (
                  dailyBreakdown.map((r) => (
                    <tr key={r.date} className="border-b border-gray-100">
                      <td className="py-2 pr-4">{r.date}</td>
                      <td className="py-2 pr-4">{r.orders}</td>
                      <td className="py-2 pr-4">{fmtMoneyBDT(r.revenue_all)}</td>
                      <td className="py-2 pr-4">{fmtMoneyBDT(r.revenue_paid)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/admin/orders"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Orders</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  Manage Orders
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Pending: <span className="font-semibold">{pending}</span> • Delivered:{" "}
                  <span className="font-semibold">{delivered}</span>
                </p>
              </div>
              <span className="text-slate-400 group-hover:text-sky-600 transition">→</span>
            </div>
          </Link>

          <Link
            to="/admin/products"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Products</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  Product Management
                </h2>
                <p className="mt-2 text-sm text-slate-600">Add/edit products and pricing.</p>
              </div>
              <span className="text-slate-400 group-hover:text-sky-600 transition">→</span>
            </div>
          </Link>

          <Link
            to="/admin/categories"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Catalog</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  Categories
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Manage categories & subcategories.
                </p>
              </div>
              <span className="text-slate-400 group-hover:text-sky-600 transition">→</span>
            </div>
          </Link>

          {/* ✅ NEW CARD: Vendors */}
          <Link
            to="/admin/vendors"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600">Marketplace</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                  Vendors
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Create and manage vendor accounts.
                </p>
              </div>
              <span className="text-slate-400 group-hover:text-sky-600 transition">→</span>
            </div>
          </Link>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm sm:col-span-2 lg:col-span-2">
            <p className="text-xs text-slate-600">Customers</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              Customer Insights
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Customer list & activity (later).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
