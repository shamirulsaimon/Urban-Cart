import { Link } from "react-router-dom";
import paymentLogos from "../assets/images/payment-methods.png"; // <-- make sure this path exists

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-10 md:grid-cols-4 text-sm text-slate-700">
        
        {/* Categories */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Products</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/products" className="hover:text-sky-600">All Products</Link>
            </li>
            <li> 
              <Link to="/featured" className="hover:text-sky-600">Featured Products</Link>
            </li>
          </ul>
        </div>

        {/* Useful links */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Useful Links</h3>
          <ul className="space-y-2">
            <li><Link to="/about" className="cursor-pointer hover:text-sky-600">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-sky-600">Contact Us</Link></li>
            <li><Link to="/terms" className="cursor-pointer hover:text-sky-600">Terms & Conditions</Link></li>
            <li><Link to="/privacy-policy" className="cursor-pointer hover:text-sky-600">Privacy Policy</Link></li>
            <li><Link to="/help" className="hover:text-sky-600">FAQ</Link></li>
          </ul>
        </div>

        {/* Account */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Account</h3>
          <ul className="space-y-2">
            <li> <span className="cursor-pointer hover:text-sky-600">Profile</span></li>
            <li> <Link to="/my-orders" className="cursor-pointer hover:text-sky-600">My Orders</Link></li>
            
          </ul>
        </div>

        {/* Download + Payment */}
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Download App</h3>
            <div className="flex flex-col gap-3">
              <button className="w-40 h-11 rounded-lg border border-gray-300 flex items-center justify-center text-[11px] font-medium hover:border-sky-500"><a href="https://play.google.com/store/games?hl=en">Google Play</a></button>
              <button className="w-40 h-11 rounded-lg border border-gray-300 flex items-center justify-center text-[11px] font-medium hover:border-sky-500"><a href="https://www.apple.com/app-store/">App Store</a></button>
            </div>
          </div>

          {/* Payment Logos Image */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Payment Method</h3>
            
            <div className="border border-gray-300 rounded-xl p-3 bg-white">
              <img
                src={paymentLogos}
                alt="Payment methods available in Bangladesh"
                className="w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap gap-3 justify-center">
            <button className="hover:text-sky-600">About</button>
            <button className="hover:text-sky-600">Contact</button>
            <button className="hover:text-sky-600">Privacy Policy</button>
            <button className="hover:text-sky-600">Terms & Conditions</button>
            <button className="hover:text-sky-600">Refund & Return Policy</button>
          </div>

          <p className="text-center">
            © Copyright 2025 <span className="font-semibold text-gray-800">Urban Cart</span>.
            All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
