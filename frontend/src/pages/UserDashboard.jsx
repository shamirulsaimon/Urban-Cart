import { useMemo } from "react";
import { Link } from "react-router-dom";

function money(n) {
  const x = Number(n || 0);
  return `৳ ${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function cap(s) {
  if (!s) return "—";
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();

  const cls =
    s === "delivered"
      ? "bg-green-50 text-green-700 border-green-200"
      : s === "cancelled" || s === "canceled"
      ? "bg-red-50 text-red-700 border-red-200"
      : s === "refunded"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : s === "shipped"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {cap(status)}
    </span>
  );
}

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:bg-gray-50"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          <div className="mt-1 text-xs text-gray-600">{desc}</div>
        </div>
        <div className="text-gray-400 group-hover:text-gray-700">→</div>
      </div>
    </Link>
  );
}

export default function UserDashboard() {
  // ✅ Dummy user info
  const user = {
    name: "Samirul Rahman",
    email: "samirul@example.com",
    tier: "Regular Customer",
  };

  // ✅ Dummy orders
  const orders = [
    {
      id: 1012,
      code: "UC-1012",
      date: "2026-01-20",
      status: "processing",
      total: 2890,
      items: 3,
    },
    {
      id: 1008,
      code: "UC-1008",
      date: "2026-01-15",
      status: "shipped",
      total: 1520,
      items: 1,
    },
    {
      id: 1001,
      code: "UC-1001",
      date: "2026-01-05",
      status: "delivered",
      total: 6490,
      items: 5,
    },
    {
      id: 998,
      code: "UC-0998",
      date: "2025-12-28",
      status: "cancelled",
      total: 990,
      items: 1,
    },
  ];

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const inProgress = orders.filter((o) =>
      ["pending", "confirmed", "processing"].includes(String(o.status).toLowerCase())
    ).length;
    const delivered = orders.filter((o) => String(o.status).toLowerCase() === "delivered").length;
    const totalSpent = orders
      .filter((o) => String(o.status).toLowerCase() !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return { totalOrders, inProgress, delivered, totalSpent };
  }, [orders]);

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome, <span className="font-medium text-gray-900">{user.name}</span>
              {" "}— manage your orders & account.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/products"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Continue Shopping
            </Link>
            <Link
              to="/cart"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              View Cart
            </Link>
          </div>
        </div>

        {/* Profile strip */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">{user.name}</div>
              <div className="mt-1 text-xs text-gray-600">{user.email}</div>
              <div className="mt-2 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                {user.tier}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/profile"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Edit Profile
              </Link>
              <Link
                to="/my-orders"
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                My Orders
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Orders" value={stats.totalOrders} sub="All time" />
          <StatCard title="In Progress" value={stats.inProgress} sub="Pending / Processing" />
          <StatCard title="Delivered" value={stats.delivered} sub="Completed" />
          <StatCard title="Total Spent" value={money(stats.totalSpent)} sub="Excluding cancelled" />
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Quick actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-gray-600">Navigate faster.</p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <QuickLink to="/my-orders" label="My Orders" desc="Track & view details" />
              <QuickLink to="/wishlist" label="Wishlist" desc="Saved items for later" />
              <QuickLink to="/addresses" label="Addresses" desc="Manage shipping addresses" />
              <QuickLink to="/profile" label="Account Settings" desc="Profile & password" />
            </div>
          </div>

          {/* Recent orders */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
                <p className="mt-1 text-sm text-gray-600">Latest order activity.</p>
              </div>

              <Link
                to="/my-orders"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
              <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                <div className="col-span-4">Order</div>
                <div className="col-span-3">Date</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div className="divide-y divide-gray-200">
                {orders.slice(0, 6).map((o) => (
                  <div key={o.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-gray-50">
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900">{o.code}</div>
                      <div className="text-xs text-gray-500">{o.items} items</div>
                    </div>
                    <div className="col-span-3 text-gray-700">
                      {new Date(o.date).toLocaleDateString()}
                    </div>
                    <div className="col-span-3">
                      <StatusPill status={o.status} />
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-900">
                      {money(o.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              Tip: You can add “Reorder” button later to quickly add previous items to cart.
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Need help?</h2>
              <p className="mt-1 text-sm text-gray-600">
                Visit FAQ or contact support for delivery/payment issues.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/faq"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
