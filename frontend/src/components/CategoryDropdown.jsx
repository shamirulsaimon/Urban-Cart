import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function CategoryDropdown() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);

  const wrapRef = useRef(null);

  // Load categories (public)
  useEffect(() => {
    axios
      .get(`${API_BASE}/api/catalog/categories/`)
      .then((res) => {
        const data = res.data?.results || res.data || [];
        setCategories(data);
        if (data.length > 0 && !activeCat) setActiveCat(data[0]); // nice default
      })
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load ALL subcategories once
  useEffect(() => {
    axios
      .get(`${API_BASE}/api/catalog/subcategories/`)
      .then((res) => setSubcategories(res.data?.results || res.data || []))
      .catch(() => setSubcategories([]));
  }, []);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredSubcategories = useMemo(() => {
    if (!activeCat) return [];
    return subcategories.filter(
      (s) => Number(s.categoryId) === Number(activeCat.id)
    );
  }, [subcategories, activeCat]);

  return (
    <div className="relative" ref={wrapRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition
          ${
            open
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
      >
        <span>Categories</span>
        <span
          className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-[760px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
            <div className="text-sm font-semibold text-gray-800">
              Browse Categories
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-600"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-12">
            {/* Left: Categories */}
            <div className="col-span-4 border-r bg-white">
              <div className="max-h-[420px] overflow-y-auto p-2">
                {categories.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No categories</div>
                ) : (
                  categories.map((c) => {
                    const active = activeCat?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setActiveCat(c)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition
                          ${
                            active
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="line-clamp-1">{c.name}</span>
                          <span
                            className={`text-xs ${
                              active ? "text-blue-600" : "text-gray-400"
                            }`}
                          >
                            ›
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Subcategories */}
            <div className="col-span-8 bg-white">
              <div className="p-4">
                {!activeCat ? (
                  <div className="p-4 text-sm text-gray-500">
                    Select a category
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          Subcategories
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {activeCat.name}
                        </div>
                      </div>

                      <Link
                        to={`/category/${activeCat.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-xs font-medium px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        View all
                      </Link>
                    </div>

                    {filteredSubcategories.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 border rounded-xl">
                        No subcategories for this category.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {filteredSubcategories.map((s) => (
                          <Link
                            key={s.id}
                            to={`/subcategory/${s.slug}`}
                            onClick={() => setOpen(false)}
                            className="group px-3 py-2.5 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-800 group-hover:text-blue-700 line-clamp-1">
                                {s.name}
                              </span>
                              <span className="text-xs text-gray-400 group-hover:text-blue-600">
                                →
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
                Pick a category on the left to view only its subcategories.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
