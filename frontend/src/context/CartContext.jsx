import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/**
 * IMPORTANT:
 * - We DO NOT export CartContext directly (avoids Vite Fast Refresh warnings)
 * - We export CartProvider + useCartContext hook instead
 */

const CartContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "urban_cart_items";

// Adjust these keys if your auth stores token differently
function getToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function normalizeProduct(product) {
  const title = product?.title ?? product?.name ?? "Product";
  const image =
    product?.images?.[0]?.image ||
    product?.images?.[0] ||
    product?.image ||
    "";

  return {
    productId: product?.id,
    title,
    price: Number(product?.price || 0),
    image,
    stock: product?.stock ?? null,
    slug: product?.slug || "",
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readStorage());
  const [hydratedFromServer, setHydratedFromServer] = useState(false);

  const tokenRef = useRef(getToken());

  // persist locally always (guest cart + quick UI)
  useEffect(() => {
    writeStorage(items);
  }, [items]);

  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.qty || 0), 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0), 0),
    [items]
  );

  async function fetchServerCart() {
    const token = getToken();
    if (!token) return null;
    const res = await axios.get(`${API_BASE}/api/cart/`, { headers: authHeaders() });
    return res.data;
  }

  function applyServerCart(serverCart) {
    // serverCart.items: [{id, productId, qty, product:{...}}]
    const mapped = (serverCart?.items || []).map((it) => {
      const p = it.product || {};

      // p.images from catalog serializer is array of URL strings
      const imgUrl =
        (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "") || "";

      return {
        cartItemId: it.id,
        productId: it.productId,
        qty: it.qty,
        title: p.title ?? p.name ?? "Product",
        price: Number(p.price || 0),
        image: imgUrl,
        stock: p.stock ?? null,
        slug: p.slug || "",
      };
    });

    setItems(mapped);
  }

  async function mergeLocalToServer(localItems) {
    const token = getToken();
    if (!token) return;

    const payload = {
      items: (localItems || [])
        .filter((x) => x.productId)
        .map((x) => ({ productId: x.productId, qty: Number(x.qty || 1) })),
    };

    if (payload.items.length === 0) return;

    const res = await axios.post(`${API_BASE}/api/cart/merge/`, payload, {
      headers: authHeaders(),
    });

    applyServerCart(res.data);
  }

  // initial hydrate
  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        setHydratedFromServer(false);
        return;
      }

      try {
        const serverCart = await fetchServerCart();
        if (serverCart) applyServerCart(serverCart);
        setHydratedFromServer(true);
      } catch (e) {
        console.error("Cart hydrate failed:", e?.response?.data || e.message);
        setHydratedFromServer(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // detect token changes (login/logout) and merge guest cart on login
  useEffect(() => {
    const id = setInterval(() => {
      const currentToken = getToken();
      const prevToken = tokenRef.current;

      if (currentToken !== prevToken) {
        tokenRef.current = currentToken;

        // Logout -> fallback to local cart
        if (!currentToken) {
          setHydratedFromServer(false);
          setItems(readStorage());
          return;
        }

        // Login -> merge guest cart into server cart
        (async () => {
          try {
            const guestItems = readStorage();
            await mergeLocalToServer(guestItems);
            localStorage.removeItem(STORAGE_KEY); // prevent double merge
            setHydratedFromServer(true);
          } catch (e) {
            console.error("Cart merge after login failed:", e?.response?.data || e.message);
          }
        })();
      }
    }, 800);

    return () => clearInterval(id);
  }, []);

  // -------- Public API used in ProductCard / Cart page --------

  async function addToCart(product, qty = 1) {
    const q = Math.max(1, Number(qty || 1));
    const snapshot = normalizeProduct(product);
    if (!snapshot.productId) return;

    // optimistic update
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productId === snapshot.productId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: Number(copy[idx].qty || 0) + q };
        return copy;
      }
      return [...prev, { ...snapshot, qty: q }];
    });

    // server sync if logged in
    const token = getToken();
    if (!token) return;

    try {
      // compute final qty from latest state snapshot (approx)
      const local = readStorage();
      const found = local.find((x) => x.productId === snapshot.productId);
      const finalQty = (found?.qty || 0) + q;

      const res = await axios.post(
        `${API_BASE}/api/cart/items/`,
        { productId: snapshot.productId, qty: finalQty },
        { headers: authHeaders() }
      );
      applyServerCart(res.data);
    } catch (e) {
      console.error("addToCart sync failed:", e?.response?.data || e.message);
    }
  }

  async function setQty(productId, qty) {
    const q = Math.max(1, Number(qty || 1));
    setItems((prev) => prev.map((x) => (x.productId === productId ? { ...x, qty: q } : x)));

    const token = getToken();
    if (!token) return;

    try {
      const res = await axios.post(
        `${API_BASE}/api/cart/items/`,
        { productId, qty: q },
        { headers: authHeaders() }
      );
      applyServerCart(res.data);
    } catch (e) {
      console.error("setQty sync failed:", e?.response?.data || e.message);
    }
  }

  async function removeFromCart(productId) {
    setItems((prev) => prev.filter((x) => x.productId !== productId));

    const token = getToken();
    if (!token) return;

    const existing = items.find((x) => x.productId === productId);

    try {
      if (existing?.cartItemId) {
        await axios.delete(`${API_BASE}/api/cart/items/${existing.cartItemId}/`, {
          headers: authHeaders(),
        });
      }
      const refreshed = await fetchServerCart();
      if (refreshed) applyServerCart(refreshed);
    } catch (e) {
      console.error("removeFromCart sync failed:", e?.response?.data || e.message);
    }
  }

  async function clearCart() {
    setItems([]);

    const token = getToken();
    if (!token) return;

    try {
      const serverCart = await fetchServerCart();
      const list = serverCart?.items || [];

      for (const it of list) {
        await axios.delete(`${API_BASE}/api/cart/items/${it.id}/`, { headers: authHeaders() });
      }

      const refreshed = await fetchServerCart();
      if (refreshed) applyServerCart(refreshed);
    } catch (e) {
      console.error("clearCart sync failed:", e?.response?.data || e.message);
    }
  }

  const value = {
    items,
    totalItems,
    totalPrice,
    hydratedFromServer,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within <CartProvider />");
  return ctx;
}
