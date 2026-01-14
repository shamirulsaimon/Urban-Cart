import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

import api from "./api/client";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer.jsx";

import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails.jsx";
import Cart from "./pages/Cart.jsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Contact from "./pages/Contact.jsx";
import Help from "./pages/Help.jsx";
import MyOrders from "./pages/MyOrders";

import CategoryProducts from "./pages/CategoryProducts.jsx";
import SubcategoryProducts from "./pages/SubcategoryProducts";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccess from "./pages/OrderSuccess";


// ✅ NEW: payment redirect pages
import PaymentSuccess from "./pages/PaymentSuccessPage.jsx";
import PaymentFail from "./pages/PaymentFailPage.jsx";
import PaymentCancel from "./pages/PaymentCancelPage.jsx";
import PaymentDemoPage from "./pages/PaymentDemoPage.jsx";
// ✅ Admin UI
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./admin/AdminProducts";
import AdminCategories from "./admin/AdminCategories";
import AdminOrders from "./admin/AdminOrders";
import AdminVendors from "./admin/AdminVendors";

// ✅ Vendor UI
import VendorDashboard from "./vendor/VendorDashboard";
import VendorProducts from "./vendor/VendorProducts";
import VendorCategories from "./vendor/VendorCategories";

// ✅ NEW: Vendor Orders pages
import VendorOrders from "./vendor/VendorOrders";
import VendorOrderDetail from "./vendor/VendorOrderDetail";

/* =========================
   Admin Route (unchanged)
========================= */
function AdminRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;

  try {
    const payload = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);

    const isValid = payload?.exp && payload.exp > now;
    const isAdmin = Boolean(payload?.is_staff || payload?.is_superuser);

    if (!isValid) return <Navigate to="/login" replace state={{ from: location }} />;
    if (!isAdmin) return <Navigate to="/" replace />;

    return children;
  } catch {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
}

/* =========================
   Vendor Route (unchanged)
========================= */
function VendorRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("accessToken");

  const [state, setState] = useState({ loading: true, allowed: false });

  useEffect(() => {
    let alive = true;

    async function checkVendor() {
      if (!token) {
        if (alive) setState({ loading: false, allowed: false });
        return;
      }

      // 1) fast check from token (if role exists)
      try {
        const payload = jwtDecode(token);
        const now = Math.floor(Date.now() / 1000);
        const isValid = payload?.exp && payload.exp > now;

        if (!isValid) {
          if (alive) setState({ loading: false, allowed: false });
          return;
        }

        if (payload?.role) {
          if (alive) setState({ loading: false, allowed: payload.role === "vendor" });
          return;
        }
      } catch {
        if (alive) setState({ loading: false, allowed: false });
        return;
      }

      // 2) fallback to backend "me"
      try {
        const res = await api.get("/auth/me/");
        const role = res.data?.role;
        if (alive) setState({ loading: false, allowed: role === "vendor" });
      } catch {
        if (alive) setState({ loading: false, allowed: false });
      }
    }

    checkVendor();
    return () => {
      alive = false;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (state.loading) return <div className="p-6">Loading vendor access…</div>;
  if (!state.allowed) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-offwhite text-primary flex flex-col">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetails />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* ✅ Payment redirect routes */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/payment/demo" element={<PaymentDemoPage />} />

          <Route path="/order-success/:orderId" element={<OrderSuccess />} />
          <Route path="/my-orders" element={<MyOrders />} />

          <Route path="/category/:slug" element={<CategoryProducts />} />
          <Route path="/subcategory/:slug" element={<SubcategoryProducts />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />


          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <AdminRoute>
                <AdminCategories />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminRoute>
                <AdminProducts />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/vendors"
            element={
              <AdminRoute>
                <AdminVendors />
              </AdminRoute>
            }
          />

          {/* Vendor Routes */}
          <Route
            path="/vendor"
            element={
              <VendorRoute>
                <VendorDashboard />
              </VendorRoute>
            }
          />

          <Route
            path="/vendor/products"
            element={
              <VendorRoute>
                <VendorProducts />
              </VendorRoute>
            }
          />

          <Route
            path="/vendor/categories"
            element={
              <VendorRoute>
                <VendorCategories />
              </VendorRoute>
            }
          />

          <Route
            path="/vendor/subcategories"
            element={
              <VendorRoute>
                <VendorCategories />
              </VendorRoute>
            }
          />

          {/* ✅ NEW Vendor Orders Routes */}
          <Route
            path="/vendor/orders"
            element={
              <VendorRoute>
                <VendorOrders />
              </VendorRoute>
            }
          />
          <Route
            path="/vendor/orders/:id"
            element={
              <VendorRoute>
                <VendorOrderDetail />
              </VendorRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<div className="p-10">404 Not Found</div>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
