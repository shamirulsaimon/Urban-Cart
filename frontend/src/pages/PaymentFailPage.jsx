import { useNavigate } from "react-router-dom";

export default function PaymentFailPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-red-700">
          Payment Failed ❌
        </h1>
        <p className="mt-4 text-gray-700">
          Your payment was not completed. Please try again.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Try Again
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
