const faqs = [
  {
    q: "How can I track my order?",
    a: "After placing an order you will receive an SMS/email with tracking information. You can also view your orders from the 'My Orders' section after logging in.",
  },
  {
    q: "What is your return & refund policy?",
    a: "Most items can be returned within 7 days of delivery if they are unused and in original packaging. Refunds are processed to your original payment method.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "We accept major cards (Visa, MasterCard), mobile banking (bKash, Nagad, Rocket) and cash on delivery in selected areas.",
  },
  {
    q: "How can I contact customer support?",
    a: "You can contact us via the Contact Us page, email, or our hotline number mentioned there.",
  },
];

export default function Help() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Help & FAQ</h1>
      <p className="text-sm text-slate-600 mb-6">
        Find answers to common questions about orders, payments and delivery.
      </p>

      <div className="space-y-3">
        {faqs.map((item, idx) => (
          <details
            key={idx}
            className="bg-white rounded-xl shadow-sm p-4 open:shadow-md transition-shadow"
          >
            <summary className="cursor-pointer text-sm font-medium text-gray-900">
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-slate-700">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
