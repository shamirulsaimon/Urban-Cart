import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // 🟢 single toast instead of array

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();

    // Replace any existing toast
    setToast({ id, message, type });

    // Auto-hide after 2.3s
    setTimeout(() => {
      setToast((current) => (current && current.id === id ? null : current));
    }, 2300);
  }, []);

  const getToastColor = (type) => {
    switch (type) {
      case "error":
        return "bg-rose-500";
      case "warning":
        return "bg-amber-500";
      case "info":
        return "bg-blue-500";
      case "success":
      default:
        return "bg-emerald-500";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Single toast container */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`max-w-xs px-4 py-2 rounded-lg shadow text-sm text-white
              animate-slide-in transform transition-all duration-300
              ${getToastColor(toast.type)}
            `}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
