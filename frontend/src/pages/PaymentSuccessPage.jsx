import { useLocation, useNavigate } from "react-router-dom";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const orderId = params.get("orderId") || location.state?.orderId || "";
  const isDemo = params.get("demo") === "1";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-green-700">
          Payment Successful ✅
        </h1>

        {isDemo && (
          <div className="mt-3 p-3 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">
            Demo mode: payment was simulated (no real transaction).
          </div>
        )}

        <p className="mt-4 text-gray-700">
          Your order has been placed successfully.
        </p>

        {orderId && (
          <p className="mt-2 text-sm text-gray-600">
            Order ID: <span className="font-medium">{orderId}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {orderId ? (
            <button
              onClick={() => navigate(`/order-success/${orderId}`)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              View Order
            </button>
          ) : null}

          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
