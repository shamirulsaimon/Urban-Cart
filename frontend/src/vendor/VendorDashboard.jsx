import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  async function loadSummary() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/orders/vendor/dashboard/summary/");
      setSummary(res.data);
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
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Products
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Active Products</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : products}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-600">Total Orders (yours)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {loading ? "…" : totalOrders}
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

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/vendor/products"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <p className="text-xs text-slate-600">Catalog</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              Manage Products
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Add/edit products and upload images.
            </p>
            <div className="mt-3 text-slate-400 group-hover:text-sky-600">→</div>
          </Link>

          <Link
            to="/vendor/categories"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <p className="text-xs text-slate-600">Catalog</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              Categories
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Create your categories and subcategories.
            </p>
            <div className="mt-3 text-slate-400 group-hover:text-sky-600">→</div>
          </Link>

          <Link
            to="/vendor/orders"
            className="group bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
          >
            <p className="text-xs text-slate-600">Orders</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">
              View Orders
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Track orders that include your products.
            </p>
            <div className="mt-3 text-slate-400 group-hover:text-sky-600">→</div>
          </Link>
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
