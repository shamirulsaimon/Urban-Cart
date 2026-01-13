import { useEffect, useRef, useState } from "react";
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
      .then((res) => setCategories(res.data?.results || res.data || []))
      .catch(() => setCategories([]));
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

  const loadSubs = async (cat) => {
    setActiveCat(cat);
    try {
      const res = await axios.get(
        `${API_BASE}/api/catalog/subcategories/?category=${cat.slug}`
      );
      setSubcategories(res.data?.results || res.data || []);
    } catch {
      setSubcategories([]);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 font-medium text-gray-700 hover:text-blue-600"
      >
        Categories <span className="text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[520px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="grid grid-cols-2">
            {/* Categories */}
            <div className="border-r max-h-[360px] overflow-y-auto">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => loadSubs(c)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${
                    activeCat?.id === c.id ? "bg-gray-50 font-medium" : ""
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Subcategories */}
            <div className="max-h-[360px] overflow-y-auto">
              {!activeCat ? (
                <div className="p-4 text-sm text-gray-500">
                  Select a category
                </div>
              ) : subcategories.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  No subcategories
                </div>
              ) : (
                <>
                  <Link
                    to={`/category/${activeCat.slug}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 border-b"
                  >
                    View all in {activeCat.name}
                  </Link>

                  {subcategories.map((s) => (
                    <Link
                      key={s.id}
                      to={`/subcategory/${s.slug}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      {s.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
