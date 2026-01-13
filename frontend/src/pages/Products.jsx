import { useEffect, useState } from "react";
import api from "../api/client";
import ProductCard from "../components/ProductCard";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Simple filters (can expand later)
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/catalog/products/");
        setProducts(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // For now, filters are only UI (no backend query params yet)
  const visibleProducts = products; // later apply filters here

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">All Products</h1>
          <p className="text-sm text-slate mt-1">
            Products are loaded from your Django backend API
            (<code className="bg-gray-100 px-1 rounded text-[11px]">
              /api/catalog/products/
            </code>).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <select
            className="border border-gray-300 bg-white rounded-lg px-2 py-1"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {/* later you can load real categories from /api/catalog/categories/ */}
          </select>

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
      {loading && (
        <p className="text-sm text-slate">Loading products...</p>
      )}
      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}

      {/* Grid */}
      {!loading && visibleProducts.length === 0 && !error && (
        <p className="text-sm text-slate">No products found.</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
