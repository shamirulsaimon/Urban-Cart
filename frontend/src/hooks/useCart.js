import { useCartContext } from "../context/CartContext.jsx";

// ✅ Named export (preferred)
export const useCart = () => useCartContext();

// ✅ Default export (backward compatible with older imports)
export default useCart;
