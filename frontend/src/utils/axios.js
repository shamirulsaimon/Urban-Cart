import axios from "axios";

const instance = axios.create({
  baseURL: "http://127.0.0.1:8000", // Django backend
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  // ✅ Keep your existing key, but add fallback keys (minimal & safe)
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * ✅ NEW (minimal): blob downloader using this axios instance
 * Usage:
 *   await instanceDownloadBlob("/api/orders/my/3/invoice/", "invoice.pdf");
 */
export async function instanceDownloadBlob(path, filename = "download.pdf") {
  // ✅ Critical fix for "Network Error" in many setups:
  // Turn off credentials for this blob request to avoid stricter CORS preflight.
  const res = await instance.get(path, {
    responseType: "blob",
    withCredentials: false,
  });

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

export default instance;
