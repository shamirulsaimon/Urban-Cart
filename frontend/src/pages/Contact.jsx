export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Contact Us
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Have a question about an order, payment, or our products? Send us a
        message and we’ll get back to you as soon as possible.
      </p>

      <div className="grid md:grid-cols-[2fr,1fr] gap-6">
        {/* Form */}
        <form className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500 outline-none"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500 outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Subject
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500 outline-none"
              placeholder="How can we help?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Message
            </label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500 outline-none resize-y"
              placeholder="Write your message..."
            />
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Send Message
          </button>
        </form>

        {/* Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 text-sm text-slate-700">
          <h2 className="text-sm font-semibold text-gray-900">
            Customer Support
          </h2>
          <p>
            Phone: <span className="font-medium">01956541027</span>
          </p>
          <p>
            Email:{" "}
            <span className="font-medium">support@urbancart.example</span>
          </p>
          <p>
            Hours: <span className="font-medium">10:00 AM – 10:00 PM</span>
          </p>

          <h2 className="text-sm font-semibold text-gray-900 pt-2">
            Office Address
          </h2>
          <p>
            Urban Cart HQ
            <br />
            Dhaka, Bangladesh
          </p>
        </div>
      </div>
    </div>
  );
}
