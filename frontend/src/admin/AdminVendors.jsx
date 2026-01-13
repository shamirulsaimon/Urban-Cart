import { useEffect, useState } from "react";
import api from "../api/client";

export default function AdminVendors() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const [error, setError] = useState("");
  const [vendors, setVendors] = useState([]);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  // ✅ support array OR paginated response
  function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  }

  async function loadVendors(q = "") {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/vendors/", {
        params: q ? { search: q } : undefined,
      });

      setVendors(normalizeList(res.data));
    } catch (e) {
      console.error(e);
      setError("Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  }

  async function createVendor(e) {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name || "",
        last_name: form.last_name || "",
      };

      const res = await api.post("/admin/vendors/", payload);

      // Prepend new vendor, keep list responsive
      setVendors((prev) => [res.data, ...prev]);
      setForm({ email: "", password: "", first_name: "", last_name: "" });
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.email?.[0] ||
        e?.response?.data?.detail ||
        "Failed to create vendor.";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(vendor) {
    setSavingId(vendor.id);
    setError("");
    try {
      const res = await api.patch(`/admin/vendors/${vendor.id}/`, {
        is_active: !vendor.is_active,
      });

      setVendors((prev) =>
        prev.map((v) => (v.id === vendor.id ? res.data : v))
      );
    } catch (e) {
      console.error(e);
      setError("Failed to update vendor.");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    document.title = "Admin Vendors • Urban Cart";
    loadVendors();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
            <p className="mt-2 text-slate-600">
              Create vendor accounts and enable/disable access.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-white border border-rose-200 text-rose-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {/* Create vendor */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create Vendor</h2>
          <form
            onSubmit={createVendor}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="Email"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              required
            />
            <input
              value={form.password}
              onChange={(e) =>
                setForm((s) => ({ ...s, password: e.target.value }))
              }
              placeholder="Password"
              type="password"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              required
              minLength={6}
            />
            <input
              value={form.first_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, first_name: e.target.value }))
              }
              placeholder="First name (optional)"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={form.last_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, last_name: e.target.value }))
              }
              placeholder="Last name (optional)"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />

            <button
              disabled={creating}
              className="sm:col-span-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create Vendor"}
            </button>
          </form>
        </div>

        {/* Search + list */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vendor List</h2>
              <p className="mt-1 text-sm text-slate-600">
                Search by email and manage active status.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email…"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={() => loadVendors(search.trim())}
                disabled={loading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              >
                {loading ? "Loading…" : "Search"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-600 border-b border-gray-200">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td className="py-3 text-slate-600" colSpan={5}>
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4">{v.email}</td>
                      <td className="py-2 pr-4">
                        {v.first_name || v.last_name
                          ? `${v.first_name || ""} ${v.last_name || ""}`.trim()
                          : "—"}
                      </td>
                      <td className="py-2 pr-4">{v.role}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            v.is_active
                              ? "text-emerald-700 font-medium"
                              : "text-rose-700 font-medium"
                          }
                        >
                          {v.is_active ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => toggleActive(v)}
                          disabled={savingId === v.id}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
                        >
                          {savingId === v.id
                            ? "Saving…"
                            : v.is_active
                            ? "Disable"
                            : "Enable"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
