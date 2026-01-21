import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";

export default function CardDemo() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const orderId = sp.get("orderId");

  const [cardName, setCardName] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");

  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function sendOtp() {
    setErr("");
    setMsg("");

    if (!orderId) return setErr("Missing orderId.");
    if (!cardName || !cardNo || !exp || !cvv) return setErr("Please fill all card fields.");

    try {
      setLoading(true);
      await api.post("/orders/demo/send-otp/", {
        order_id: Number(orderId),
        channel: "card",
      });
      setMsg("OTP sent to your email (demo).");
      setStep(2);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setErr("");
    setMsg("");

    if (!orderId) return setErr("Missing orderId.");
    if (!otp) return setErr("OTP is required.");

    try {
      setLoading(true);
      const res = await api.post("/orders/demo/verify-otp/", {
        order_id: Number(orderId),
        otp,
      });

      const paidOrderId = res?.data?.id || orderId;
      nav(`/order-success/${paidOrderId}`, { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.detail || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Card Payment (Demo)</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav(`/payment/select?orderId=${encodeURIComponent(orderId || "")}`)}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Change Method
          </button>
          <button
            onClick={() => nav("/my-orders")}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        ⚠ Demo only. No real transaction. OTP is sent to your login email.
      </div>

      {err && (
        <div className="mt-4 p-3 rounded bg-red-50 text-red-600">{err}</div>
      )}
      {msg && (
        <div className="mt-4 p-3 rounded bg-green-50 text-green-700">{msg}</div>
      )}

      <div className="mt-4 bg-white border rounded-2xl p-5">
        {step === 1 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Card Holder Name *</label>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Name on card"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm mb-1">Card Number *</label>
                <input
                  value={cardNo}
                  onChange={(e) => setCardNo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Expiry (MM/YY) *</label>
                <input
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="MM/YY"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">CVV *</label>
                <input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="123"
                  inputMode="numeric"
                />
              </div>
            </div>

            <button
              onClick={sendOtp}
              disabled={loading}
              className="mt-4 w-full px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send OTP to Email"}
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm mb-1">Enter OTP *</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="6-digit OTP"
              inputMode="numeric"
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="mt-4 w-full px-4 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Confirm Payment"}
            </button>

            <button
              onClick={sendOtp}
              disabled={loading}
              className="mt-3 w-full px-4 py-3 rounded-xl border hover:bg-gray-50 disabled:opacity-50"
            >
              Resend OTP
            </button>
          </>
        )}
      </div>
    </div>
  );
}
