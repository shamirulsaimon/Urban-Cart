export const authStorage = {
  getAccess() {
    return localStorage.getItem("access_token");
  },
  getRefresh() {
    return localStorage.getItem("refresh_token");
  },
  setTokens({ access, refresh }) {
    if (access) localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
  },
  clear() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};
