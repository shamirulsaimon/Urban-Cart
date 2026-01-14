import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const params = useParams();
  const [search] = useSearchParams();

  // ✅ supports BOTH:
  // /reset-password/:uid/:token
  // /reset-password?uid=...&token=...
  const uid = params.uid || search.get("uid") || "";
  const token = params.token || search.get("token") || "";

  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/auth/reset-password/", {
        uid,
        token,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });

      setMessage(res.data.detail || "Password reset successful.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Reset link is invalid or has expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
      <h1 className="text-2xl font-semibold mb-4 text-center">
        Reset Password
      </h1>

      {message && <p className="text-green-600 text-sm mb-3">{message}</p>}
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {!message && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            name="new_password"
            placeholder="New password"
            value={form.new_password}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm password"
            value={form.confirm_password}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 text-white py-2 rounded disabled:opacity-60"
          >
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
