import { Link, NavLink, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

import logo from "../assets/logo.png";
import { useCart } from "../hooks/useCart.js";
import CategoryDropdown from "../components/CategoryDropdown";
import api from "../api/client";

export default function Navbar() {
  const navigate = useNavigate();
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

      // 1) Fast path: decode token (might not include role depending on login endpoint)
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

      // 2) Fallback: ask backend who I am (you already have /api/auth/me/)
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
      } catch (e) {
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

  return (
    <header className="bg-white border-b">
      {/* Top bar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Urban Cart" className="h-8 w-auto" />
          <span className="font-semibold text-sm tracking-wide">URBAN CART</span>
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <input
            placeholder="Search products..."
            className="w-full px-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Right */}
        <div className="flex items-center gap-4 text-sm">
          {roleState.isLoggedIn ? (
            <>
              <span className="hidden lg:inline text-gray-600">
                Hi, {roleState.displayName}
              </span>

              {/* ✅ Vendor button -> Vendor Dashboard */}
              {roleState.isVendor && (
                <NavLink
                  to="/vendor"
                  className="px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  Vendor
                </NavLink>
              )}

              {/* Admin button */}
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
