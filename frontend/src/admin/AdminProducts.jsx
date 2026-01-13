import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ✅ supports multiple token key names
function authHeaders() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseList(text) {
  if (!text) return [];
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  try {
    return JSON.stringify(data);
  } catch {
    return "Request failed";
  }
}

const emptyForm = {
  title: "",
  description: "",
  price: "",
  discountType: "",
  discountValue: "",
  discountStart: "",
  discountEnd: "",
  stock: 0,
  sku: "",
  brand: "",
  tagsText: "",
  categoryId: "",
  subcategoryId: "",
  isActive: true,
  imagesFiles: [],
};

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(""); // "", "true", "false"
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // dropdowns
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search.trim()) params.set("search", search.trim());
    if (activeFilter !== "") params.set("is_active", activeFilter);
    return `${API_BASE}/api/admin/products/?${params.toString()}`;
  }, [page, search, activeFilter]);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await axios.get(queryUrl, { headers: authHeaders() });
      setItems(res.data.results || []);
      setCount(res.data.count || 0);
    } catch (e) {
      setErr(toErrorMessage(e) || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await axios.get(
        `${API_BASE}/api/admin/categories/?is_active=true&ordering=sort_order,name`,
        { headers: authHeaders() }
      );
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setCategories(list);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  }

  async function loadSubcategories(categoryId) {
    try {
      if (!categoryId) {
        setSubcategories([]);
        return;
      }
      const res = await axios.get(
        `${API_BASE}/api/admin/subcategories/?categoryId=${categoryId}&is_active=true&ordering=sort_order,name`,
        { headers: authHeaders() }
      );
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setSubcategories(list);
    } catch (e) {
      console.error("Failed to load subcategories", e);
      setSubcategories([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryUrl]);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update subcategories when category changes
  useEffect(() => {
    loadSubcategories(form.categoryId);
    setForm((f) => ({ ...f, subcategoryId: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      title: p.title || "",
      description: p.description || "",
      price: p.price ?? "",
      discountType: p.discountType || "",
      discountValue: p.discountValue ?? "",
      discountStart: "",
      discountEnd: "",
      stock: p.stock ?? 0,
      sku: p.sku ?? "",
      brand: p.brand ?? "",
      tagsText: (p.tags || []).join(", "),
      categoryId: p.categoryId ?? "",
      subcategoryId: p.subcategoryId ?? "",
      isActive: !!p.isActive,
      imagesFiles: [],
    });
    setModalOpen(true);

    if (p.categoryId) loadSubcategories(p.categoryId);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function buildFormData() {
    const fd = new FormData();

    fd.append("title", form.title.trim());
    fd.append("description", form.description || "");
    fd.append("price", String(Number(form.price || 0)));
    fd.append("stock", String(Number(form.stock || 0)));

    fd.append("sku", form.sku?.trim() || "");
    fd.append("brand", form.brand || "");

    fd.append("discountType", form.discountType ? form.discountType : "");
    fd.append("discountValue", form.discountType ? String(Number(form.discountValue || 0)) : "");
    fd.append("discountStart", form.discountType && form.discountStart ? new Date(form.discountStart).toISOString() : "");
    fd.append("discountEnd", form.discountType && form.discountEnd ? new Date(form.discountEnd).toISOString() : "");

    fd.append("categoryId", form.categoryId ? String(Number(form.categoryId)) : "");
    fd.append("subcategoryId", form.subcategoryId ? String(Number(form.subcategoryId)) : "");

    fd.append("isActive", form.isActive ? "true" : "false");

    const tags = parseList(form.tagsText);
    tags.forEach((t) => fd.append("tags", t));

    (form.imagesFiles || []).forEach((file) => {
      fd.append("imagesInput", file);
    });

    return fd;
  }

  async function save(e) {
    e.preventDefault();
    setErr("");

    try {
      setLoading(true);
      const fd = buildFormData();
      const headers = { ...authHeaders(), "Content-Type": "multipart/form-data" };

      if (editing?.id) {
        await axios.patch(`${API_BASE}/api/admin/products/${editing.id}/`, fd, { headers });
      } else {
        await axios.post(`${API_BASE}/api/admin/products/`, fd, { headers });
      }

      closeModal();
      load();
    } catch (e2) {
      setErr(toErrorMessage(e2) || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(p) {
    try {
      await axios.patch(
        `${API_BASE}/api/admin/products/${p.id}/`,
        { isActive: !p.isActive },
        { headers: authHeaders() }
      );
      load();
    } catch (e) {
      setErr(toErrorMessage(e) || "Failed to update status");
    }
  }

  async function adjustStock(p, delta) {
    try {
      await axios.patch(
        `${API_BASE}/api/admin/products/${p.id}/stock/`,
        { delta },
        { headers: authHeaders() }
      );
      load();
    } catch (e) {
      setErr(toErrorMessage(e) || "Stock update failed");
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  // previews
  const [previewUrls, setPreviewUrls] = useState([]);
  useEffect(() => {
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    const urls = (form.imagesFiles || []).map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.imagesFiles]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage products, stock, images, and active status.</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90">
          Add Product
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by title / SKU / slug / brand..."
            className="w-full sm:w-[360px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
          />

          <div className="flex items-center gap-3">
            <select
              value={activeFilter}
              onChange={(e) => {
                setPage(1);
                setActiveFilter(e.target.value);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <button onClick={load} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              Refresh
            </button>
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-600 break-words">{err}</div> : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Stock</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={5}>
                    No products found.
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const img = (p.images && p.images[0]) || "";
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                            {img ? (
                              <img src={img} alt={p.title} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-400">No img</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{p.title}</div>
                            <div className="text-xs text-gray-500">{p.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">{p.price}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.stock}</span>
                          <button
                            onClick={() => adjustStock(p, -1)}
                            className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            −
                          </button>
                          <button
                            onClick={() => adjustStock(p, +1)}
                            className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(p)}
                          className={`px-3 py-1 rounded-full text-xs border ${
                            p.isActive
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Page {page} of {totalPages} • {count} total
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Scrollable Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          {/* ✅ max height + flex column */}
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* header stays visible */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="font-semibold text-gray-900">{editing ? "Edit Product" : "Add Product"}</div>
              <button onClick={closeModal} className="px-3 py-2 rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>

            {/* ✅ form area scrolls */}
            <form onSubmit={save} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Subcategory</label>
                <select
                  value={form.subcategoryId}
                  onChange={(e) => setForm((f) => ({ ...f, subcategoryId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                  disabled={!form.categoryId}
                >
                  <option value="">Select subcategory</option>
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Stock</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Brand</label>
                <input
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Discount Type</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">None</option>
                  <option value="PERCENT">PERCENT</option>
                  <option value="FIXED">FIXED</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Discount Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                  disabled={!form.discountType}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Discount Start</label>
                <input
                  type="datetime-local"
                  value={form.discountStart}
                  onChange={(e) => setForm((f) => ({ ...f, discountStart: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                  disabled={!form.discountType}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Discount End</label>
                <input
                  type="datetime-local"
                  value={form.discountEnd}
                  onChange={(e) => setForm((f) => ({ ...f, discountEnd: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                  disabled={!form.discountType}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">Tags (comma or newline)</label>
                <input
                  value={form.tagsText}
                  onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">Product Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setForm((f) => ({ ...f, imagesFiles: files }));
                  }}
                  className="w-full mt-1"
                />

                {previewUrls.length > 0 ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {previewUrls.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="w-full aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                      >
                        <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
                  disabled={loading}
                >
                  {editing ? "Save Changes" : "Create Product"}
                </button>
              </div>

              {err ? <div className="sm:col-span-2 text-sm text-red-600 break-words">{err}</div> : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
