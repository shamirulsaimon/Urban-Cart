import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentDemoPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const orderId = params.get("orderId") || "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">Payment Demo</h1>

        <div className="mt-3 p-3 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
          Demo mode: This simulates payment results (no real transaction).
        </div>

        {orderId && (
          <p className="mt-3 text-sm text-gray-700">
            Order ID: <span className="font-semibold">{orderId}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() =>
              navigate(`/payment/success?orderId=${encodeURIComponent(orderId)}&demo=1`, {
                replace: true,
              })
            }
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            Simulate Success
          </button>

          <button
            onClick={() => navigate("/payment/fail", { replace: true })}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Simulate Fail
          </button>

          <button
            onClick={() => navigate("/payment/cancel", { replace: true })}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
          >
            Simulate Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
