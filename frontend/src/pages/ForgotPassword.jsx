import { useState } from "react";
import api from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInfo("");
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/forgot-password/", { email });
      setInfo(res.data.detail || "If this email exists, a reset link has been sent.");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-6">
      <h1 className="text-2xl font-semibold mb-4 text-center">Forgot password</h1>
      <p className="text-xs text-slate mb-4 text-center">
        Enter your account email and we'll send you a password reset link.
      </p>

      {info && <p className="text-xs text-emerald-600 mb-3 text-center">{info}</p>}
      {error && <p className="text-xs text-rose-600 mb-3 text-center">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block mb-1 text-xs font-medium text-slate">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-sky-600 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
