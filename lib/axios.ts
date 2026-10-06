import axios, { type InternalAxiosRequestConfig } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "";

const instance = axios.create({
  baseURL,
});

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function setAdminAccessCookie(token: string) {
  if (typeof window === "undefined") return;
  document.cookie = `admin_access_token=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
}

function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("admin_access_token");
  localStorage.removeItem("admin_refresh_token");
  document.cookie = "admin_access_token=; path=/; max-age=0";
  window.location.href = "/login";
}

// Single in-flight refresh: avoid multiple refresh calls when several requests get 401
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refresh = localStorage.getItem("admin_refresh_token");
  if (!refresh) return null;

  try {
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${baseURL}/api/token/refresh/`,
      { refresh },
      { headers: { "Content-Type": "application/json" } }
    );
    const newAccess = data?.access;
    if (newAccess) {
      localStorage.setItem("admin_access_token", newAccess);
      // The backend rotates refresh tokens and blacklists the old one, so the
      // new one must be stored or the next refresh fails and logs the admin out.
      if (data.refresh) {
        localStorage.setItem("admin_refresh_token", data.refresh);
      }
      setAdminAccessCookie(newAccess);
      return newAccess;
    }
  } catch {
    // Refresh failed (expired or invalid)
  }
  return null;
}

instance.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const token = localStorage.getItem("admin_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || typeof window === "undefined") {
      return Promise.reject(error);
    }

    // Don't retry if this was the refresh request itself or we already retried
    if (originalRequest.url?.includes("/api/token/refresh/") || originalRequest._retry) {
      clearAuth();
      return Promise.reject(error);
    }

    // One refresh for all concurrent 401s
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;

    if (newToken) {
      originalRequest._retry = true;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return instance(originalRequest);
    }

    clearAuth();
    return Promise.reject(error);
  }
);

export default instance;
