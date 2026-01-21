import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client";
import ProductCard from "../components/ProductCard";

export default function Products() {
  const location = useLocation();
  const isFeaturedPage = location.pathname === "/featured";
  const searchQuery = new URLSearchParams(location.search).get("search") || "";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("featured"); // "featured" | "price-asc" | "price-desc"

  // ✅ Discount detection based on your backend fields
  // Your API returns discountType + discountValue (and optional start/end) :contentReference[oaicite:4]{index=4}
  function isDiscounted(p) {
    const dv = Number(p?.discountValue ?? 0);
    const dt = p?.discountType;

    if (!dt) return false;
    if (!Number.isFinite(dv) || dv <= 0) return false;

    // Optional: respect date window if present
    const now = Date.now();
    const ds = p?.discountStart ? new Date(p.discountStart).getTime() : null;
    const de = p?.discountEnd ? new Date(p.discountEnd).getTime() : null;

    if (ds && now < ds) return false;
    if (de && now > de) return false;

    return true;
  }

  // Load categories once
  useEffect(() => {
    let alive = true;

    async function loadCategories() {
      try {
        const res = await api.get("/catalog/categories/");
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (!alive) return;
        setCategories(data);
      } catch (e) {
        if (!alive) return;
        setCategories([]);
      }
    }

    loadCategories();
    return () => {
      alive = false;
    };
  }, []);

  // Load products whenever category/sort changes
  useEffect(() => {
    let alive = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const params = {};
        // add search if present (DRF SearchFilter expects "search")
        if (searchQuery.trim()) params.search = searchQuery.trim();
        // Backend supports category slug filter: ?category=<slug> :contentReference[oaicite:5]{index=5}
        if (categoryFilter !== "all") params.category = categoryFilter;

        // Backend supports ordering=price or -price (OrderingFilter) :contentReference[oaicite:6]{index=6}
        if (sort === "price-asc") params.ordering = "price";
        if (sort === "price-desc") params.ordering = "-price";

        const res = await api.get("/catalog/products/", { params });
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];

        if (!alive) return;
        setProducts(data);
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setError("Failed to load products.");
        setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      alive = false;
    };
  }, [categoryFilter, sort, location.search]);

  // Featured page filter (frontend)
  const visibleProducts = useMemo(() => {
    if (!isFeaturedPage) return products;
    return products.filter(isDiscounted);
  }, [products, isFeaturedPage]);

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {isFeaturedPage ? "Featured Products" : "All Products"}
          </h1>
          <p className="text-sm text-slate mt-1">
            {isFeaturedPage
              ? "Only discounted products are shown here."
              : "All products from the marketplace"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {/* Categories dropdown */}
          <select
            className="border border-gray-300 bg-white rounded-lg px-2 py-1"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort dropdown */}
          <select
            className="border border-gray-300 bg-white rounded-lg px-2 py-1"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Loading / error */}
      {loading && <p className="text-sm text-slate">Loading products...</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && visibleProducts.length === 0 && !error && (
        <p className="text-sm text-slate">
          {isFeaturedPage ? "No discounted products found." : "No products found."}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
