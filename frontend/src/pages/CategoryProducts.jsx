import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function adaptProductForCard(p) {
  const urls = Array.isArray(p.images) ? p.images : [];
  return {
    ...p,
    name: p.title ?? p.name ?? "",
    images: urls.map((u) => ({ image: u })),
  };
}

export default function CategoryProducts() {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/catalog/products/?category=${slug}`);
        const list = res.data?.results || res.data || [];
        setProducts(list.map(adaptProductForCard));
      } catch (e) {
        console.error(e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold capitalize">{slug.replaceAll("-", " ")}</h1>
        <p className="text-sm text-gray-500 mt-1">Category products</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-sm text-gray-500">No products found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
