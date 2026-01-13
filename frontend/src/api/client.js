import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  withCredentials: false,
});

// ---- Helpers
// ---- Helpers (UPDATED: supports old + new token keys safely)
const getAccess = () =>
  localStorage.getItem("accessToken") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("token");

const getRefresh = () =>
  localStorage.getItem("refreshToken") ||
  localStorage.getItem("refresh_token") ||
  localStorage.getItem("refresh");

const setAccess = (token) => {
  // keep your current architecture: canonical key is accessToken
  localStorage.setItem("accessToken", token);
};

const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("token");
};


// ---- Request: attach access token
api.interceptors.request.use(
  (config) => {
    const token = getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response: refresh on 401 (with queue)
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;

      try {
        const refresh = getRefresh();
        if (!refresh) {
          clearTokens();
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Refresh endpoint: /api/auth/refresh/
        const res = await axios.post(
          "http://127.0.0.1:8000/api/auth/refresh/",
          { refresh }
        );

        const newAccess = res.data?.access;
        if (!newAccess) throw new Error("No access token returned from refresh");

        setAccess(newAccess);
        processQueue(null, newAccess);

        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * ✅ Download any file (xlsx/pdf/etc) as blob using this API client.
 * Example:
 *   await downloadBlob("/admin/orders/export-excel/?start=...&end=...", "orders.xlsx")
 */
export async function downloadBlob(path, filename = "download.xlsx") {
  const res = await api.get(path, { responseType: "blob" });

  const blob = new Blob([res.data], {
    type: res.headers?.["content-type"] || "application/octet-stream",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);

  return true;
}

// Named + default export (safe for all import styles)
export { api };
export default api;
