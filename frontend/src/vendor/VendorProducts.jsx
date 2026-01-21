import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";

function extractList(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

function toIntOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toNumOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function isNowInRange(startIso, endIso) {
  const now = Date.now();
  const s = startIso ? new Date(startIso).getTime() : null;
  const e = endIso ? new Date(endIso).getTime() : null;

  if (s && Number.isNaN(s)) return false;
  if (e && Number.isNaN(e)) return false;

  if (s && now < s) return false;
  if (e && now > e) return false;
  return true;
}

function computeDiscountPreview(price, discountType, discountValue) {
  const p = Number(price);
  const dv = Number(discountValue);

  if (!Number.isFinite(p) || p <= 0) return null;
  if (!discountType) return null;
  if (!Number.isFinite(dv) || dv <= 0) return null;

  let save = 0;
  const t = String(discountType).toUpperCase();

  // supports "PERCENT" or "FLAT" (or "FIXED")
  if (t === "PERCENT" || t === "PERCENTAGE") {
    save = (p * dv) / 100;
  } else if (t === "FLAT" || t === "FIXED" || t === "AMOUNT") {
    save = dv;
  } else {
    return null;
  }

  if (save < 0) save = 0;
  if (save > p) save = p;

  const final = p - save;
  return { price: p, save, final, type: t, value: dv };
}

export default function VendorProducts() {
  const [products, setProducts] = useState([]);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    subcategory: "",
    discountType: "",
    discountValue: "",
    discountStart: "",
    discountEnd: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [newProductId, setNewProductId] = useState(null);

  const [imagesByProduct, setImagesByProduct] = useState({});
  const [openImages, setOpenImages] = useState({});

  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ show which user backend identifies for vendor endpoint
  const [vendorUserId, setVendorUserId] = useState(null);

  // ✅ scroll to form on edit
  const formRef = useRef(null);

  // ✅ per-product reorder state
  const [reorderSaving, setReorderSaving] = useState({});
  const [reorderMsg, setReorderMsg] = useState({}); // { [productId]: "Saved ✓" | "Error..." }

  /* ======================
     LOADERS
  ====================== */
  async function loadProducts() {
    const res = await api.get("/catalog/vendor/products/");
    setProducts(extractList(res.data));

    const vid = res?.headers?.["x-vendor-userid"] || res?.headers?.["x-vendor-user-id"];
    setVendorUserId(vid || null);
  }

  async function loadCategories() {
    const res = await api.get("/catalog/vendor/categories/");
    setCategories(extractList(res.data));
  }

  async function loadSubcategories(categoryId) {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    const res = await api.get("/catalog/vendor/subcategories/");
    const list = extractList(res.data);
    const filtered = list.filter((s) => Number(s.category) === Number(categoryId));
    setSubcategories(filtered);
  }

  function buildPayload() {
    const payload = {
      name: form.name.trim(), // ✅ IMPORTANT: backend expects "name"
      description: form.description,
      price: String(form.price).trim(),
      stock: Number(form.stock),

      brand: form.brand || "",
      brand_name: form.brand || "",

      category: toIntOrNull(form.category),
      subcategory: toIntOrNull(form.subcategory),
    };

    if (form.discountType) {
      payload.discountType = form.discountType;
      payload.discountValue = form.discountValue;

      const ds = toIsoOrNull(form.discountStart);
      const de = toIsoOrNull(form.discountEnd);
      if (ds) payload.discountStart = ds;
      if (de) payload.discountEnd = de;
    } else {
      payload.discountType = null;
      payload.discountValue = null;
      payload.discountStart = null;
      payload.discountEnd = null;
    }

    return payload;
  }

  function resetForm() {
    setForm({
      name: "",
      brand: "",
      description: "",
      price: "",
      stock: "",
      category: "",
      subcategory: "",
      discountType: "",
      discountValue: "",
      discountStart: "",
      discountEnd: "",
    });
    setSubcategories([]);
    setEditingId(null);
    setNewProductId(null);
    setCreateError("");
  }

  /* ======================
     CREATE PRODUCT
  ====================== */
  async function createProduct(e) {
    e.preventDefault();
    setCreateError("");
    setSaving(true);

    try {
      const payload = buildPayload();
      const res = await api.post("/catalog/vendor/products/", payload);

      const createdId = res?.data?.id;
      if (createdId) setNewProductId(createdId);

      resetForm();
      await loadProducts();
    } catch (err) {
      const data = err?.response?.data;
      console.error("Create product error:", data);
      if (typeof data === "string") setCreateError(data);
      else if (data && typeof data === "object") setCreateError(JSON.stringify(data));
      else setCreateError("Failed to create product.");
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     EDIT PRODUCT
  ====================== */
  function startEdit(p) {
    setCreateError("");
    setNewProductId(null);

    const catId = p.category ?? p.categoryId ?? p.category_id ?? "";
    const subId = p.subcategory ?? p.subcategoryId ?? p.subcategory_id ?? "";

    setEditingId(p.id);

    setForm({
      name: p.title || p.name || "",
      brand: p.brand || p.brand_name || "",
      description: p.description || "",
      price: p.price ?? "",
      stock: p.stock ?? "",
      category: catId ? String(catId) : "",
      subcategory: subId ? String(subId) : "",
      discountType: p.discountType || p.discount_type || "",
      discountValue: p.discountValue || p.discount_value || "",
      // For date inputs, prefer keeping empty if backend returns ISO without local conversion.
      // Vendor can re-set if needed.
      discountStart: "",
      discountEnd: "",
    });

    if (catId) {
      loadSubcategories(catId).catch((e) => console.error("loadSubcategories:", e));
    } else {
      setSubcategories([]);
    }

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function updateProduct(e) {
    e.preventDefault();
    if (!editingId) return;

    setCreateError("");
    setSaving(true);

    try {
      const payload = buildPayload();
      await api.patch(`/catalog/vendor/products/${editingId}/`, payload);

      await loadProducts();
      resetForm();
    } catch (err) {
      const data = err?.response?.data;
      console.error("Update product error:", data);
      if (typeof data === "string") setCreateError(data);
      else if (data && typeof data === "object") setCreateError(JSON.stringify(data));
      else setCreateError("Failed to update product.");
    } finally {
      setSaving(false);
    }
  }

  /* ======================
     IMAGE HANDLING
  ====================== */
  async function toggleImages(productId) {
    const next = !openImages[productId];
    setOpenImages((s) => ({ ...s, [productId]: next }));
    if (next) await loadImages(productId);
  }

  async function loadImages(productId) {
    const res = await api.get(`/catalog/vendor/products/${productId}/images/`);
    setImagesByProduct((s) => ({ ...s, [productId]: extractList(res.data) }));
  }

  async function uploadImage(productId, file) {
    if (!file) return;
    setReorderMsg((m) => ({ ...m, [productId]: "" }));

    const fd = new FormData();
    fd.append("image", file);

    await api.post(`/catalog/vendor/products/${productId}/images/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    await loadImages(productId);
    await loadProducts();
  }

  async function deleteImage(productId, imageId) {
    setReorderMsg((m) => ({ ...m, [productId]: "" }));
    await api.delete(`/catalog/vendor/products/images/${imageId}/`);
    await loadImages(productId);
    await loadProducts();
  }

  function moveImage(productId, index, dir) {
    const list = imagesByProduct[productId] || [];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= list.length) return;

    const next = [...list];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setImagesByProduct((s) => ({ ...s, [productId]: next }));

    setReorderMsg((m) => ({ ...m, [productId]: "Order changed (not saved)" }));
  }

  async function saveReorder(productId) {
    const list = imagesByProduct[productId] || [];
    const ordered_ids = list.map((x) => x.id).filter(Boolean);

    if (!ordered_ids.length) {
      setReorderMsg((m) => ({ ...m, [productId]: "No images to reorder." }));
      return;
    }

    setReorderSaving((s) => ({ ...s, [productId]: true }));
    setReorderMsg((m) => ({ ...m, [productId]: "" }));

    try {
      await api.post(`/catalog/vendor/products/${productId}/images/reorder/`, { ordered_ids });

      await loadImages(productId);
      await loadProducts();

      setReorderMsg((m) => ({ ...m, [productId]: "Saved ✓" }));
    } catch (err) {
      const data = err?.response?.data;
      console.error("Reorder save error:", data);

      let msg = "Failed to save order.";
      if (typeof data === "string") msg = data;
      else if (data && typeof data === "object") msg = JSON.stringify(data);

      setReorderMsg((m) => ({ ...m, [productId]: msg }));
    } finally {
      setReorderSaving((s) => ({ ...s, [productId]: false }));
    }
  }

  async function deleteProduct(id) {
    await api.delete(`/catalog/vendor/products/${id}/delete/`);
    await loadProducts();
    if (editingId === id) resetForm();
  }

  /* ======================
     INIT
  ====================== */
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const onSubmit = editingId ? updateProduct : createProduct;

  // ✅ Discount preview (form)
  const discountPreview = useMemo(() => {
    return computeDiscountPreview(form.price, form.discountType, form.discountValue);
  }, [form.price, form.discountType, form.discountValue]);

  const startIso = useMemo(() => toIsoOrNull(form.discountStart), [form.discountStart]);
  const endIso = useMemo(() => toIsoOrNull(form.discountEnd), [form.discountEnd]);

  const dateRangeOk = useMemo(() => {
    if (!form.discountStart && !form.discountEnd) return true;
    const s = startIso ? new Date(startIso).getTime() : null;
    const e = endIso ? new Date(endIso).getTime() : null;
    if (s && e && s > e) return false;
    return true;
  }, [form.discountStart, form.discountEnd, startIso, endIso]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Vendor Products</h1>

      {vendorUserId && (
        <div className="text-sm text-gray-600">
          Backend vendor userId: <span className="font-semibold">{vendorUserId}</span>
        </div>
      )}

      {/* Create / Edit Product Form */}
      <div ref={formRef} className="border rounded-xl bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">
              {editingId ? "Edit product" : "Add a new product"}
            </div>
            <div className="text-sm text-gray-600">
              {editingId
                ? "Update the existing product (no need to create again)."
                : "Create the product first, then upload images."}
            </div>

            {editingId && (
              <div className="mt-2 inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 text-xs">
                Editing product #{editingId}
              </div>
            )}

            {newProductId && !editingId && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg inline-block px-3 py-1">
                Product created (ID: {newProductId}). Now upload images below.
              </div>
            )}
          </div>

          {editingId && (
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel Edit
            </button>
          )}
        </div>

        {createError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {createError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-gray-700">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="border px-3 py-2 rounded w-full"
                placeholder="Product name"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Brand</label>
              <input
                value={form.brand}
                onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))}
                className="border px-3 py-2 rounded w-full"
                placeholder="e.g. BenQ"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Stock</label>
              <input
                value={form.stock}
                onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))}
                className="border px-3 py-2 rounded w-full"
                placeholder="e.g. 10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Price</label>
              <input
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                className="border px-3 py-2 rounded w-full"
                placeholder="e.g. 999.99"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value;
                  setForm((s) => ({ ...s, category, subcategory: "" }));
                  loadSubcategories(category);
                }}
                className="border px-3 py-2 rounded w-full"
              >
                <option value="">Select category</option>
                {safeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Subcategory</label>
              <select
                value={form.subcategory}
                onChange={(e) => setForm((s) => ({ ...s, subcategory: e.target.value }))}
                className="border px-3 py-2 rounded w-full"
                disabled={!form.category}
              >
                <option value="">Select subcategory</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ Discount UI */}
          <div className="border rounded-xl p-4 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Discount</div>
                <div className="text-xs text-gray-600">
                  Optional. If empty, product will be shown with normal price.
                </div>
              </div>

              {form.discountType && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((s) => ({
                      ...s,
                      discountType: "",
                      discountValue: "",
                      discountStart: "",
                      discountEnd: "",
                    }))
                  }
                  className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-white"
                  disabled={saving}
                >
                  Clear discount
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-700">Type</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((s) => ({ ...s, discountType: e.target.value }))}
                  className="border px-3 py-2 rounded w-full bg-white"
                >
                  <option value="">No discount</option>
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FLAT">Fixed amount (৳)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">Value</label>
                <input
                  value={form.discountValue}
                  onChange={(e) => setForm((s) => ({ ...s, discountValue: e.target.value }))}
                  className="border px-3 py-2 rounded w-full bg-white"
                  placeholder={form.discountType === "PERCENT" ? "e.g. 10" : "e.g. 200"}
                  disabled={!form.discountType}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">Start (optional)</label>
                <input
                  type="datetime-local"
                  value={form.discountStart}
                  onChange={(e) => setForm((s) => ({ ...s, discountStart: e.target.value }))}
                  className="border px-3 py-2 rounded w-full bg-white"
                  disabled={!form.discountType}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">End (optional)</label>
                <input
                  type="datetime-local"
                  value={form.discountEnd}
                  onChange={(e) => setForm((s) => ({ ...s, discountEnd: e.target.value }))}
                  className="border px-3 py-2 rounded w-full bg-white"
                  disabled={!form.discountType}
                />
              </div>
            </div>

            {/* ✅ Live preview */}
            <div className="rounded-lg border bg-white p-3">
              {!form.discountType ? (
                <div className="text-sm text-gray-600">Preview: No discount applied.</div>
              ) : !dateRangeOk ? (
                <div className="text-sm text-rose-700">
                  Date range invalid: Start time cannot be after End time.
                </div>
              ) : discountPreview ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="text-gray-700">
                    Original: <span className="font-semibold">৳{fmtMoney(discountPreview.price)}</span>
                  </div>
                  <div className="text-emerald-700">
                    You save: <span className="font-semibold">৳{fmtMoney(discountPreview.save)}</span>
                  </div>
                  <div className="text-blue-700">
                    Final: <span className="font-semibold">৳{fmtMoney(discountPreview.final)}</span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {startIso || endIso ? (
                      <span>
                        Active window:{" "}
                        {startIso ? new Date(startIso).toLocaleString() : "now"} →{" "}
                        {endIso ? new Date(endIso).toLocaleString() : "no end"}
                      </span>
                    ) : (
                      <span>Always active (no dates set)</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  Preview: Enter a valid Price and Discount Value to see final price.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Product Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              className="border px-3 py-2 rounded w-full min-h-[110px]"
              placeholder="Write details: features, warranty, delivery info..."
            />
          </div>

          <button
            className="bg-black text-white py-2 rounded w-full disabled:opacity-60"
            disabled={saving}
          >
            {saving
              ? editingId
                ? "Updating..."
                : "Creating..."
              : editingId
              ? "Update Product"
              : "Create Product"}
          </button>
        </form>
      </div>

      {/* Product list */}
      <div className="space-y-3">
        <div className="text-lg font-semibold">My products</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {safeProducts.map((p) => {
            const images = Array.isArray(p?.images) ? p.images : [];
            const cover = images?.[0] || null;

            const pid = p.id;
            const isSavingReorder = !!reorderSaving[pid];
            const msg = reorderMsg[pid] || "";

            // Prefer API computed flags if present, otherwise fallback compute
            const hasDiscount = !!(p.hasDiscount ?? p.has_discount);
            const finalPrice = p.finalPrice ?? p.final_price;
            const discountAmount = p.discountAmount ?? p.discount_amount;

            const fallbackPreview = computeDiscountPreview(
              p.price,
              p.discountType || p.discount_type,
              p.discountValue || p.discount_value
            );

            const startIsoP = p.discountStart || p.discount_start || null;
            const endIsoP = p.discountEnd || p.discount_end || null;
            const activeNow =
              hasDiscount && isNowInRange(startIsoP, endIsoP);

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="w-full h-72 bg-gray-50 flex items-center justify-center relative">
                  {cover ? (
                    <img
                      src={cover}
                      alt={p.title || p.name || "Product"}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-sm text-gray-400">No image</div>
                  )}

                  {(hasDiscount || fallbackPreview) && (
                    <div className="absolute top-3 left-3">
                      <span
                        className={`text-xs px-3 py-1 rounded-full border ${
                          activeNow
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}
                      >
                        {activeNow ? "Discount Active" : "Discount Set"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <div className="text-xl font-semibold text-gray-900">
                    {p.title || p.name || "Untitled"}
                  </div>

                  <div className="text-sm text-gray-600">
                    {hasDiscount && finalPrice != null ? (
                      <>
                        <span className="font-semibold text-blue-700">
                          ৳{fmtMoney(finalPrice)}
                        </span>
                        <span className="ml-2 line-through text-gray-500">
                          ৳{fmtMoney(p.price)}
                        </span>
                        {discountAmount != null ? (
                          <span className="ml-2 text-emerald-700">
                            Save ৳{fmtMoney(discountAmount)}
                          </span>
                        ) : null}
                      </>
                    ) : fallbackPreview ? (
                      <>
                        <span className="font-semibold text-blue-700">
                          ৳{fmtMoney(fallbackPreview.final)}
                        </span>
                        <span className="ml-2 line-through text-gray-500">
                          ৳{fmtMoney(fallbackPreview.price)}
                        </span>
                        <span className="ml-2 text-emerald-700">
                          Save ৳{fmtMoney(fallbackPreview.save)}
                        </span>
                      </>
                    ) : (
                      <>৳{p.price}</>
                    )}
                    <span> • Stock: {p.stock}</span>
                    {(p.brand || p.brand_name) ? (
                      <span> • Brand: {p.brand || p.brand_name}</span>
                    ) : null}
                  </div>

                  {p.description ? (
                    <p className="text-sm leading-6 text-gray-700">{p.description}</p>
                  ) : null}

                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-gray-200 text-gray-900 hover:bg-gray-50"
                      onClick={() => toggleImages(p.id)}
                    >
                      {openImages[p.id] ? "Hide Images" : "Manage Images"}
                    </button>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-gray-200 text-gray-900 hover:bg-gray-50"
                      onClick={() => startEdit(p)}
                    >
                      Edit Product
                    </button>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => deleteProduct(p.id)}
                    >
                      Delete Product
                    </button>
                  </div>

                  {openImages[p.id] && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      <div className="text-sm font-medium text-gray-900">
                        Upload / Reorder Images
                      </div>

                      <input
                        type="file"
                        onChange={(e) => uploadImage(p.id, e.target.files?.[0])}
                      />

                      <div className="space-y-2">
                        {(imagesByProduct[p.id] || []).map((img, idx) => (
                          <div
                            key={img.id}
                            className="flex items-center gap-2 border border-gray-200 rounded-lg p-2"
                          >
                            <img
                              src={img.url || img.image || img.image_url}
                              alt=""
                              className="h-16 w-16 object-cover rounded border border-gray-200"
                            />

                            <div className="flex-1 text-sm text-gray-600">#{img.id}</div>

                            <button
                              type="button"
                              className="px-2 py-1 border border-gray-200 rounded"
                              onClick={() => moveImage(p.id, idx, -1)}
                              disabled={isSavingReorder}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="px-2 py-1 border border-gray-200 rounded"
                              onClick={() => moveImage(p.id, idx, +1)}
                              disabled={isSavingReorder}
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              className="px-2 py-1 border border-rose-200 rounded text-rose-700 hover:bg-rose-50"
                              onClick={() => deleteImage(p.id, img.id)}
                              disabled={isSavingReorder}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>

                      {msg && (
                        <div
                          className={`text-sm rounded-lg px-3 py-2 border ${
                            msg.toLowerCase().includes("fail") || msg.startsWith("{")
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {msg}
                        </div>
                      )}

                      <button
                        type="button"
                        className="bg-black text-white py-2 rounded-lg w-full disabled:opacity-60"
                        onClick={() => saveReorder(p.id)}
                        disabled={isSavingReorder}
                      >
                        {isSavingReorder ? "Saving..." : "Save Order"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
