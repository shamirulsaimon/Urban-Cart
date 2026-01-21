import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="bg-white border rounded-2xl p-6 md:p-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-semibold text-primary">
            About Urban Cart
          </h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Urban Cart is a multi-vendor e-commerce platform designed to connect
            customers with trusted vendors in a single marketplace. The system
            focuses on a smooth shopping experience, reliable order handling,
            and role-based dashboards for vendors and administrators.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/products"
              className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Browse Products
            </Link>
            <Link
              to="/contact"
              className="px-5 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-primary">Our Mission</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            To make online shopping simple, fast, and trustworthy by providing a
            unified marketplace where vendors can grow and customers can shop
            confidently.
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-primary">Our Vision</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            To become a scalable multi-vendor commerce solution that supports
            vendors with modern tools while maintaining a seamless customer
            experience.
          </p>
        </div>
      </section>

      {/* What we offer */}
      <section className="bg-white border rounded-2xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-primary">What We Offer</h2>

        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-gray-200">
            <div className="text-sm font-semibold text-gray-900">
              Multi-vendor Marketplace
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Vendors list products while customers explore everything in one place.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200">
            <div className="text-sm font-semibold text-gray-900">
              Secure Authentication
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Role-based access for customers, vendors, and administrators.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200">
            <div className="text-sm font-semibold text-gray-900">
              Order & Payment Flow
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Smooth checkout and clear order status tracking.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200">
            <div className="text-sm font-semibold text-gray-900">
              Admin & Vendor Dashboards
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Manage products, categories, orders, and reports efficiently.
            </p>
          </div>
        </div>
      </section>

      {/* Note (Akij Venture context) */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-blue-900">
          Project Context
        </h2>
        <p className="mt-2 text-sm text-blue-900/80 leading-relaxed">
          Urban Cart was developed as part of a software engineering practicum /
          internship context aligned with Akij Venture, focusing on real-world
          multi-vendor marketplace requirements and scalable architecture.
        </p>
      </section>
    </div>
  );
}
