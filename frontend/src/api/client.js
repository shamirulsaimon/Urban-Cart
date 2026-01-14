import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  withCredentials: false,
});

// ---- Helpers
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

// ✅ Public endpoints: never attach Bearer, never refresh-loop
const isPublicAuthEndpoint = (url = "") =>
  url.includes("/auth/login/") ||
  url.includes("/auth/register/") ||
  url.includes("/auth/forgot-password/") ||
  url.includes("/auth/reset-password/") ||
  url.includes("/auth/refresh/");

// ---- Request: attach access token (skip public auth endpoints)
api.interceptors.request.use(
  (config) => {
    const url = config?.url || "";
    if (!isPublicAuthEndpoint(url)) {
      const token = getAccess();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response: refresh on 401 (skip public auth endpoints)
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

    // ✅ Never refresh/redirect for login/reset/forgot endpoints
    if (isPublicAuthEndpoint(original?.url || "")) {
      return Promise.reject(error);
    }

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

export { api };
export default api;
