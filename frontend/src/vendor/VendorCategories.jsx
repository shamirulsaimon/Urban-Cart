import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function extractList(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export default function VendorCategories() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [catName, setCatName] = useState("");

  const [subName, setSubName] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");

  const [filterCategoryId, setFilterCategoryId] = useState("");

  async function loadCategories() {
    const res = await api.get("/catalog/vendor/categories/");
    setCategories(extractList(res.data));
  }

  async function loadSubcategories() {
    const res = await api.get("/catalog/vendor/subcategories/");
    setSubcategories(extractList(res.data));
  }

  async function createCategory(e) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return;

    await api.post("/catalog/vendor/categories/", { name });
    setCatName("");
    await loadCategories();
  }

  async function createSubcategory(e) {
    e.preventDefault();
    const name = subName.trim();
    if (!name) return;
    if (!subCategoryId) return;

    await api.post("/catalog/vendor/subcategories/", {
      name,
      category: Number(subCategoryId),
    });

    setSubName("");
    await loadSubcategories();
  }

  useEffect(() => {
    loadCategories();
    loadSubcategories();
  }, []);

  const categoryById = useMemo(() => {
    const map = {};
    (Array.isArray(categories) ? categories : []).forEach((c) => (map[c.id] = c));
    return map;
  }, [categories]);

  const filteredSubcategories = useMemo(() => {
    const list = Array.isArray(subcategories) ? subcategories : [];
    if (!filterCategoryId) return list;
    return list.filter((s) => Number(s.category) === Number(filterCategoryId));
  }, [subcategories, filterCategoryId]);

  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Vendor Categories</h1>

      {/* Create Category */}
      <div className="border rounded-lg bg-white p-5 space-y-3">
        <div className="text-lg font-semibold">Add Category</div>
        <form onSubmit={createCategory} className="flex gap-3 flex-wrap">
          <input
            className="border px-3 py-2 rounded flex-1 min-w-[240px]"
            placeholder="Category name"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
          />
          <button className="bg-black text-white px-4 py-2 rounded">
            Create
          </button>
        </form>

        <div className="pt-2">
          <div className="text-sm text-gray-600 mb-2">My Categories</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {safeCategories.map((c) => (
              <div key={c.id} className="border rounded p-3 bg-white">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">#{c.id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create SubCategory */}
      <div className="border rounded-lg bg-white p-5 space-y-3">
        <div className="text-lg font-semibold">Add Subcategory</div>

        <form onSubmit={createSubcategory} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="border px-3 py-2 rounded"
            value={subCategoryId}
            onChange={(e) => setSubCategoryId(e.target.value)}
            required
          >
            <option value="">Select category</option>
            {safeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            className="border px-3 py-2 rounded"
            placeholder="Subcategory name"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            required
          />

          <button className="bg-black text-white px-4 py-2 rounded">
            Create
          </button>
        </form>

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <div className="text-sm text-gray-600">Filter:</div>
          <select
            className="border px-3 py-2 rounded"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {safeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <div className="text-sm text-gray-600 mb-2">My Subcategories</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredSubcategories.map((s) => (
              <div key={s.id} className="border rounded p-3 bg-white">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-500">
                  Category: {categoryById[s.category]?.name || `#${s.category}`}
                </div>
                <div className="text-xs text-gray-500">#{s.id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
