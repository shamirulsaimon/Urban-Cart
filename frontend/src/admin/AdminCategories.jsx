import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client"; // ✅ use your JWT client (no new axios instance)

/**
 * NOTE:
 * We removed the local axios.create() because it was using session/CSRF,
 * which causes 401 on JWT-protected /api/admin/* endpoints.
 */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function getErrMsg(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (!status) return err?.message || "Request failed";
  if (typeof data === "string") return `${status}: ${data}`;
  if (data?.detail) return `${status}: ${data.detail}`;
  // DRF validation errors
  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
      return `${status}: ${firstKey} - ${msg}`;
    }
  }
  return `${status}: ${JSON.stringify(data)}`;
}

/**
 * Simple toast system
 */
function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={cn(
          "min-w-[280px] max-w-[360px] rounded-2xl border px-4 py-3 shadow-sm",
          toast.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : toast.type === "error"
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : "bg-white border-gray-200 text-gray-900"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              {toast.type === "success"
                ? "Success"
                : toast.type === "error"
                ? "Error"
                : "Info"}
            </div>
            <div className="mt-1 text-sm">{toast.message}</div>
          </div>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [catSearch, setCatSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  const [showInactiveCats, setShowInactiveCats] = useState(false);
  const [showInactiveSubs, setShowInactiveSubs] = useState(false);

  const [catForm, setCatForm] = useState({ name: "", slug: "", sortOrder: 0 });
  const [subForm, setSubForm] = useState({ name: "", slug: "", sortOrder: 0 });

  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // saving flags (disable buttons while saving)
  const [savingCat, setSavingCat] = useState(false);
  const [savingSub, setSavingSub] = useState(false);
  const [mutatingId, setMutatingId] = useState(null); // for row-level disable

  // toast
  const [toast, setToast] = useState(null);

  function showToast(type, message) {
    setToast({ type, message });
    // auto-dismiss
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  async function loadCategories() {
    setLoadingCats(true);
    try {
      const params = {
        search: catSearch || undefined,
        isActive: showInactiveCats ? undefined : true,
        ordering: "sort_order,name",
      };

      // ✅ JWT-authenticated request
      const res = await api.get("/admin/categories/", { params });

      const list = unwrapList(res.data);
      setCategories(list);

      if (list.length) {
        const stillExists =
          selectedCategoryId && list.some((c) => c.id === selectedCategoryId);
        if (!stillExists) setSelectedCategoryId(list[0].id);
      } else {
        setSelectedCategoryId(null);
        setSubcategories([]);
      }
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setLoadingCats(false);
    }
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    setLoadingSubs(true);
    try {
      const params = {
        categoryId,
        search: subSearch || undefined,
        isActive: showInactiveSubs ? undefined : true,
        ordering: "sort_order,name",
      };

      // ✅ JWT-authenticated request
      const res = await api.get("/admin/subcategories/", { params });

      setSubcategories(unwrapList(res.data));
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catSearch, showInactiveCats]);

  useEffect(() => {
    loadSubcategories(selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, subSearch, showInactiveSubs]);

  // ---------- Category actions ----------
  async function createCategory(e) {
    e.preventDefault();
    if (savingCat) return;

    setSavingCat(true);
    try {
      const payload = {
        name: catForm.name.trim(),
        slug: catForm.slug.trim() || undefined,
        sortOrder: Number(catForm.sortOrder) || 0,
        isActive: true,
      };

      // ✅ JWT-authenticated request
      await api.post("/admin/categories/", payload);

      setCatForm({ name: "", slug: "", sortOrder: 0 });
      showToast("success", "Category created");
      await loadCategories();
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setSavingCat(false);
    }
  }

  async function toggleCategoryActive(cat) {
    if (mutatingId) return;
    setMutatingId(cat.id);
    try {
      await api.patch(`/admin/categories/${cat.id}/`, { isActive: !cat.isActive });
      showToast("success", cat.isActive ? "Category deactivated" : "Category activated");
      await loadCategories();
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setMutatingId(null);
    }
  }

  async function softDeleteCategory(cat) {
    const ok = window.confirm(
      `Delete category "${cat.name}"?\n\nThis is a SOFT delete (it will become inactive).`
    );
    if (!ok) return;

    if (mutatingId) return;
    setMutatingId(cat.id);
    try {
      await api.delete(`/admin/categories/${cat.id}/`);
      showToast("success", "Category deleted (inactive)");
      await loadCategories();
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setMutatingId(null);
    }
  }

  async function bumpCategorySort(cat, delta) {
    if (mutatingId) return;
    setMutatingId(cat.id);
    try {
      const next = (Number(cat.sortOrder) || 0) + delta;
      await api.patch(`/admin/categories/${cat.id}/`, { sortOrder: next });
      await loadCategories();
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setMutatingId(null);
    }
  }

  // ---------- Subcategory actions ----------
  async function createSubcategory(e) {
    e.preventDefault();
    if (!selectedCategoryId) return;
    if (savingSub) return;

    setSavingSub(true);
    try {
      const payload = {
        categoryId: selectedCategoryId,
        name: subForm.name.trim(),
        slug: subForm.slug.trim() || undefined,
        sortOrder: Number(subForm.sortOrder) || 0,
        isActive: true,
      };

      await api.post("/admin/subcategories/", payload);

      setSubForm({ name: "", slug: "", sortOrder: 0 });
      showToast("success", "Subcategory created");
      await loadSubcategories(selectedCategoryId);
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setSavingSub(false);
    }
  }

  async function toggleSubcategoryActive(sub) {
    if (mutatingId) return;
    setMutatingId(sub.id);
    try {
      await api.patch(`/admin/subcategories/${sub.id}/`, { isActive: !sub.isActive });
      showToast("success", sub.isActive ? "Subcategory deactivated" : "Subcategory activated");
      await loadSubcategories(selectedCategoryId);
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setMutatingId(null);
    }
  }

  async function softDeleteSubcategory(sub) {
    const ok = window.confirm(
      `Delete subcategory "${sub.name}"?\n\nThis is a SOFT delete (it will become inactive).`
    );
    if (!ok) return;

    if (mutatingId) return;
    setMutatingId(sub.id);
    try {
      await api.delete(`/admin/subcategories/${sub.id}/`);
      showToast("success", "Subcategory deleted (inactive)");
      await loadSubcategories(selectedCategoryId);
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setMutatingId(null);
    }
  }

  async function bumpSubSort(sub, delta) {
    if (mutatingId) return;
    setMutatingId(sub.id);
    try {
      const next = (Number(sub.sortOrder) || 0) + delta;
      await api.patch(`/admin/subcategories/${sub.id}/`, { sortOrder: next });
      await loadSubcategories(selectedCategoryId);
    } catch (err) {
      showToast("error", getErrMsg(err));
    } finally {
      setMutatingId(null);
    }
  }

  const busy = savingCat || savingSub || !!mutatingId;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Categories</h1>
        <div className="text-sm text-gray-600">
          Selected: <span className="font-medium">{selectedCategory?.name || "None"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LEFT: Categories */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200"
              disabled={busy}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactiveCats}
                onChange={(e) => setShowInactiveCats(e.target.checked)}
                disabled={busy}
              />
              Show inactive
            </label>
          </div>

          <form onSubmit={createCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <input
              value={catForm.name}
              onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Name"
              className="px-3 py-2 rounded-xl border border-gray-200"
              required
              disabled={busy}
            />
            <input
              value={catForm.slug}
              onChange={(e) => setCatForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="Slug (optional)"
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={busy}
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={catForm.sortOrder}
                onChange={(e) => setCatForm((p) => ({ ...p, sortOrder: e.target.value }))}
                placeholder="Sort"
                className="w-24 px-3 py-2 rounded-xl border border-gray-200"
                disabled={busy}
              />
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                disabled={busy}
              >
                {savingCat ? "Adding…" : "Add"}
              </button>
            </div>
          </form>

          {loadingCats ? (
            <div className="py-8 text-center text-gray-500">Loading…</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => {
                const active = cat.id === selectedCategoryId;
                const rowBusy = mutatingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "py-3 flex items-center justify-between gap-3",
                      active && "bg-gray-50 rounded-xl px-2"
                    )}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="text-left flex-1"
                      disabled={busy}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.name}</span>
                        {!cat.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
                            inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        slug: {cat.slug} • sort: {cat.sortOrder}
                      </div>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => bumpCategorySort(cat, -1)}
                        className="px-2 py-1 rounded-lg border border-gray-200 disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => bumpCategorySort(cat, 1)}
                        className="px-2 py-1 rounded-lg border border-gray-200 disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => toggleCategoryActive(cat)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        {rowBusy ? "…" : cat.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => softDeleteCategory(cat)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {!categories.length && (
                <div className="py-8 text-center text-gray-500">
                  No categories found. Add one above.
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Subcategories */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              placeholder="Search subcategories…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200"
              disabled={busy || !selectedCategoryId}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactiveSubs}
                onChange={(e) => setShowInactiveSubs(e.target.checked)}
                disabled={busy || !selectedCategoryId}
              />
              Show inactive
            </label>
          </div>

          <div className="mb-3 text-sm text-gray-700">
            Category:{" "}
            <span className="font-medium">
              {selectedCategory?.name || "Select a category"}
            </span>
          </div>

          <form onSubmit={createSubcategory} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            <input
              value={subForm.name}
              onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Name"
              className="px-3 py-2 rounded-xl border border-gray-200"
              required
              disabled={busy || !selectedCategoryId}
            />
            <input
              value={subForm.slug}
              onChange={(e) => setSubForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="Slug (optional)"
              className="px-3 py-2 rounded-xl border border-gray-200"
              disabled={busy || !selectedCategoryId}
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={subForm.sortOrder}
                onChange={(e) => setSubForm((p) => ({ ...p, sortOrder: e.target.value }))}
                placeholder="Sort"
                className="w-24 px-3 py-2 rounded-xl border border-gray-200"
                disabled={busy || !selectedCategoryId}
              />
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                disabled={busy || !selectedCategoryId}
              >
                {savingSub ? "Adding…" : "Add"}
              </button>
            </div>
          </form>

          {loadingSubs ? (
            <div className="py-8 text-center text-gray-500">Loading…</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {subcategories.map((sub) => {
                const rowBusy = mutatingId === sub.id;
                return (
                  <div key={sub.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sub.name}</span>
                        {!sub.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-600">
                            inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        slug: {sub.slug} • sort: {sub.sortOrder}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => bumpSubSort(sub, -1)}
                        className="px-2 py-1 rounded-lg border border-gray-200 disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => bumpSubSort(sub, 1)}
                        className="px-2 py-1 rounded-lg border border-gray-200 disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => toggleSubcategoryActive(sub)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        {rowBusy ? "…" : sub.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => softDeleteSubcategory(sub)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-50"
                        disabled={busy || rowBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

              {selectedCategoryId && !subcategories.length && (
                <div className="py-8 text-center text-gray-500">No subcategories found.</div>
              )}

              {!selectedCategoryId && (
                <div className="py-8 text-center text-gray-500">
                  Select a category to view subcategories.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
