import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api/client";
import logo from "../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Your API client likely has baseURL like http://127.0.0.1:8000/api
      // so /auth/login/ -> /api/auth/login/
      const res = await api.post("/auth/login/", {
        email: form.email,
        password: form.password,
      });

      const { access, refresh } = res.data;

      // Persist tokens
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      // Decode JWT to determine admin (no more user.role)
      const payload = jwtDecode(access);
      const isAdmin = Boolean(payload?.is_staff || payload?.is_superuser);

      // If user tried to access a protected page, go back there
      const from = location.state?.from?.pathname;

      if (from) {
        navigate(from, { replace: true });
      } else {
        navigate(isAdmin ? "/admin" : "/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#f5f7fb] px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="Urban Cart"
            className="h-6 w-auto object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-center text-lg font-semibold text-gray-900 mb-4">
          Sign In to Your Account
        </h1>

        {error && (
          <p className="text-sm text-rose-600 mb-3 text-center">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter Email"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter Password"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Sign In Now"}
          </button>
        </form>

        {/* Extra links */}
        <div className="mt-4 text-xs text-center">
          <Link to="/forgot-password" className="text-blue-600 hover:underline">
            Forgot Password?
          </Link>
        </div>

        <p className="mt-4 text-xs text-center text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign Up Now
          </Link>
        </p>
      </div>
    </div>
  );
}
