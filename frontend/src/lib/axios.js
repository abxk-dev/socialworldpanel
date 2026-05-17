import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || (typeof window !== "undefined" ? window.location.origin : "");
const baseURL = BASE ? (BASE.endsWith("/api") ? BASE : BASE + "/api") : (typeof window !== "undefined" ? window.location.origin + "/api" : "/api");

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const url = config.url || "";
  const isResellerAdmin = url.includes("/reseller/admin");
  const isResellerApi = url.includes("/reseller/");
  let token = localStorage.getItem("token");
  if (isResellerAdmin) token = localStorage.getItem("reseller_admin_token");
  else if (isResellerApi) token = localStorage.getItem("reseller_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = (err.config?.url || "").replace(/\?.*$/, "");
    const isAuthMe = url === "auth/me" || url === "/auth/me" || url.endsWith("/auth/me");
    // Only logout on 401 from /api/auth/me (session invalid). Do NOT logout on 401/503 from other endpoints.
    if (status === 401 && isAuthMe) {
      if (url.includes("reseller/admin") || (err.config?.url || "").includes("/reseller/admin")) {
        localStorage.removeItem("reseller_admin_token");
      } else if (url.includes("reseller") || (err.config?.url || "").includes("/reseller/")) {
        localStorage.removeItem("reseller_token");
      } else {
        localStorage.removeItem("token");
      }
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login") && !window.location.pathname.includes("/reseller-admin")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
