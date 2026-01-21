import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect, useRef, useState } from "react";

import logo from "../assets/logo.png";
import { useCart } from "../hooks/useCart.js";
import CategoryDropdown from "../components/CategoryDropdown";
import api from "../api/client";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();

  const accessToken =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access");

  const [roleState, setRoleState] = useState({
    isLoggedIn: Boolean(accessToken),
    isAdmin: false,
    isVendor: false,
    displayName: "",
  });

  // ✅ Search state
  const [searchText, setSearchText] = useState("");
  const debounceRef = useRef(null);
  const ignoreNextDebounceRef = useRef(false);

  useEffect(() => {
    let alive = true;

    async function detectRole() {
      if (!accessToken) {
        if (alive) {
          setRoleState({
            isLoggedIn: false,
            isAdmin: false,
            isVendor: false,
            displayName: "",
          });
        }
        return;
      }

      let displayName = "";
      let isAdmin = false;
      let roleFromToken = null;

      try {
        const payload = jwtDecode(accessToken);
        const now = Math.floor(Date.now() / 1000);

        if (payload?.exp && payload.exp <= now) throw new Error("expired");

        displayName = payload?.email || payload?.username || "";
        isAdmin = Boolean(payload?.is_staff || payload?.is_superuser);
        roleFromToken = payload?.role ?? null;

        if (roleFromToken) {
          if (!alive) return;
          setRoleState({
            isLoggedIn: true,
            isAdmin,
            isVendor: roleFromToken === "vendor",
            displayName,
          });
          return;
        }
      } catch {
        if (!alive) return;
        setRoleState({
          isLoggedIn: false,
          isAdmin: false,
          isVendor: false,
          displayName: "",
        });
        return;
      }

      try {
        const res = await api.get("/auth/me/");
        const role = res.data?.role;

        if (!alive) return;
        setRoleState({
          isLoggedIn: true,
          isAdmin: Boolean(res.data?.is_staff || res.data?.is_superuser || isAdmin),
          isVendor: role === "vendor",
          displayName: res.data?.email || displayName || "",
        });
      } catch {
        if (!alive) return;
        setRoleState({
          isLoggedIn: true,
          isAdmin,
          isVendor: false,
          displayName,
        });
      }
    }

    detectRole();

    return () => {
      alive = false;
    };
  }, [accessToken]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("token");
    localStorage.removeItem("access");

    setRoleState({
      isLoggedIn: false,
      isAdmin: false,
      isVendor: false,
      displayName: "",
    });

    navigate("/login", { replace: true });
  };

  // ✅ helper: navigate to products with (optional) search query
  const goToSearch = (q) => {
    const query = (q || "").trim();

    if (!query) {
      // Keep user on /products when clearing search
      navigate("/products");
      return;
    }

    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  // ✅ Enter-to-search (still supported)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    ignoreNextDebounceRef.current = true; // avoid double nav (submit + debounce)
    goToSearch(searchText);
  };

  // ✅ Debounce: search while typing (only triggers when user is on /products or /featured)
  useEffect(() => {
    // Don’t run debounce if we just submitted (enter)
    if (ignoreNextDebounceRef.current) {
      ignoreNextDebounceRef.current = false;
      return;
    }

    // Only auto-search when user is browsing products/featured (prevents annoying redirect from other pages)
    const onSearchablePage =
      location.pathname === "/products" || location.pathname === "/featured";

    if (!onSearchablePage) return;

    // Clear prior timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const q = (searchText || "").trim();

      // Optional: avoid firing for 1-character queries (feel free to change to 1)
      if (q.length === 0) {
          // ✅ Do NOT kick user out of Featured page
          if (location.pathname === "/featured") return;

          navigate("/products");
          return;
        }

      if (q.length === 1) return;

      goToSearch(q);
    }, 400); // ✅ debounce delay (ms)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, location.pathname]); // run when typing, but only on /products or /featured

  const handleClearSearch = () => {
    setSearchText("");
    // Immediately navigate back to /products with no query
    navigate("/products");
  };

  return (
    <header className="bg-white border-b">
      {/* Top bar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Urban Cart" className="h-8 w-auto" />
          <span className="font-semibold text-sm tracking-wide">URBAN CART</span>
        </Link>

        {/* ✅ Search (debounced + clear button) */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-md mx-6"
        >
          <div className="relative w-full">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-2 pr-10 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            {/* ✅ Clear (×) button */}
            {searchText.trim().length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-gray-200 text-gray-600 flex items-center justify-center"
                aria-label="Clear search"
                title="Clear"
              >
                ×
              </button>
            )}
          </div>

          {/* Hidden submit button so Enter works */}
          <button type="submit" className="hidden" aria-hidden="true">
            Search
          </button>
        </form>

        {/* Right */}
        <div className="flex items-center gap-4 text-sm">
          {roleState.isLoggedIn ? (
            <>
              <span className="hidden lg:inline text-gray-600">
                Hi, {roleState.displayName}
              </span>

              {roleState.isVendor && (
                <NavLink
                  to="/vendor"
                  className="px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  Vendor
                </NavLink>
              )}

              {roleState.isAdmin && (
                <NavLink
                  to="/admin"
                  className="px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Admin
                </NavLink>
              )}

              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="hover:text-blue-600">
                Login
              </NavLink>
              <NavLink to="/register" className="hover:text-blue-600">
                Register
              </NavLink>
            </>
          )}

          <NavLink
            to="/cart"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Cart ({totalItems})
          </NavLink>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t">
        <nav className="max-w-6xl mx-auto flex items-center gap-6 px-6 py-3 text-sm">
          <CategoryDropdown />

          <NavLink to="/" className="font-medium hover:text-blue-600">
            Home
          </NavLink>

          <NavLink to="/products" className="font-medium hover:text-blue-600">
            All Products
          </NavLink>

          <NavLink to="/featured" className="font-medium hover:text-blue-600">
            Featured Products
          </NavLink>

          <NavLink to="/contact" className="font-medium hover:text-blue-600">
            Contact Us
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
