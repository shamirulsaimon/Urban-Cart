import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getColsForWidth(w) {
  // matches your grid: 2 / 3 / 4
  if (w >= 768) return 4; // md+
  if (w >= 640) return 3; // sm
  return 2; // mobile
}

function adaptProductForCard(p) {
  // Your API returns images as ["url1", "url2"]
  // But your old dummy data used: images: [{ image: "url" }]
  const urls = Array.isArray(p.images) ? p.images : [];
  return {
    ...p,
    name: p.title ?? p.name ?? "",
    images: urls.map((u) => ({ image: u })),
  };
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cols, setCols] = useState(() =>
    typeof window !== "undefined" ? getColsForWidth(window.innerWidth) : 4
  );
  const [loading, setLoading] = useState(false);

  
  const limit = useMemo(() => cols * 3, [cols]);
  
  useEffect(() => {
    function onResize() {
      setCols(getColsForWidth(window.innerWidth));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    async function loadHomeProducts() { 
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/catalog/products/`);
        const list = res.data?.results || res.data || [];
        setProducts(list.map(adaptProductForCard));
      } catch (e) {
        console.error("Failed to load products:", e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadHomeProducts();
  }, []);

  const visibleProducts = useMemo(() => products.slice(0, limit), [products, limit]);

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.15em] text-gray-500 mb-2">
            Welcome to Urban Cart
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Modern shopping, clean design.
          </h1>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            Discover curated products with a smooth experience across devices.
            Built with Django, React & Tailwind — designed as a real-world portfolio project.
          </p>
          <div className="flex gap-3">
            <button className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-900">
              Browse Featured Product
            </button>
            <button className="border border-black text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-black hover:text-white">
              View all products
            </button>
          </div>
        </div>
        <div className="w-full sm:w-60 h-40 sm:h-48 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-sm">
          Urban Cart UI Preview
        </div>
      </section>

      {/* Featured products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">products</h2>
          
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading products...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
