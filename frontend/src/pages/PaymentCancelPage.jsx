import { useNavigate } from "react-router-dom";

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-orange-700">
          Payment Cancelled ⚠️
        </h1>
        <p className="mt-4 text-gray-700">
          You cancelled the payment. You can return to checkout anytime.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate("/checkout")}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Back to Checkout
          </button>
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
