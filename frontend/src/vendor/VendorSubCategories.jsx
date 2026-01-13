import { useEffect, useState } from "react";
import api from "../api/client";

function extractList(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}

export default function VendorSubCategories() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [form, setForm] = useState({
    name: "",
    category: "",
  });

  async function loadCategories() {
    const res = await api.get("/catalog/vendor/categories/");
    setCategories(extractList(res.data));
  }

  async function loadSubCategories() {
    const res = await api.get("/catalog/vendor/subcategories/");
    setSubcategories(extractList(res.data));
  }

  async function createSubCategory(e) {
    e.preventDefault();
    const name = form.name.trim();
    const category = form.category;

    if (!name || !category) return;

    await api.post("/catalog/vendor/subcategories/", {
      name,
      category: Number(category),
    });

    setForm({ name: "", category: "" });
    await loadSubCategories();
  }

  useEffect(() => {
    loadCategories();
    loadSubCategories();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">My Subcategories</h1>

      {/* Create form */}
      <form onSubmit={createSubCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <select
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          className="border px-3 py-2 rounded"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Subcategory name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="border px-3 py-2 rounded"
        />

        <button className="bg-black text-white rounded px-4 py-2">Add</button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {subcategories.map((s) => (
          <div key={s.id} className="border rounded px-3 py-2 bg-white">
            <div className="font-medium">{s.name}</div>
            <div className="text-sm text-gray-500">
              Category ID: {s.categoryId ?? s.category}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
