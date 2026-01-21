import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

function isDiscounted(p) {
  // ✅ Works with common fields. It will return true if ANY discount condition matches.
  const price = Number(p?.price ?? 0);

  const discountPercent = Number(p?.discount_percent ?? p?.discountPercent ?? 0);
  const discountPrice = p?.discount_price ?? p?.discountPrice ?? null;
  const salePrice = p?.sale_price ?? p?.salePrice ?? null;

  if (discountPercent > 0) return true;

  if (discountPrice !== null && discountPrice !== undefined) {
    const dp = Number(discountPrice);
    if (!Number.isNaN(dp) && dp > 0 && dp < price) return true;
  }

  if (salePrice !== null && salePrice !== undefined) {
    const sp = Number(salePrice);
    if (!Number.isNaN(sp) && sp > 0 && sp < price) return true;
  }

  // if backend sends boolean like is_discounted
  if (p?.is_discounted === true || p?.isDiscounted === true) return true;

  return false;
}

export default function Featured() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        // ✅ If you already have backend filter endpoint, you can swap to:
        // const res = await api.get("/catalog/products/?discounted=true");
        const res = await api.get("/catalog/products/");
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setItems(list);
      } catch (e) {
        if (!alive) return;
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const discounted = useMemo(() => items.filter(isDiscounted), [items]);

  if (loading) return <div className="p-6">Loading featured products…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Featured Products (Discounts)</h1>

      {discounted.length === 0 ? (
        <div className="p-6 bg-white border rounded-lg">
          No discounted products found.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {discounted.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              className="bg-white border rounded-lg p-3 hover:shadow"
            >
              <div className="font-medium line-clamp-2">{p.name}</div>
              <div className="text-sm text-gray-600 mt-1">৳{p.price}</div>
              <div className="text-sm font-medium mt-1">Discount available</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
