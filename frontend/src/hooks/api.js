import axios from "axios";


const API_BASE_URL = import.meta.env.VITE_API_URL


function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }

  return null;
}


const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});


const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});


// CSRF
api.interceptors.request.use(
  (config) => {
    if (
      config.method &&
      !["get", "head", "options"].includes(
        config.method.toLowerCase()
      )
    ) {
      const csrfToken = getCookie("csrftoken");

      if (csrfToken) {
        config.headers["X-CSRFToken"] =
          decodeURIComponent(csrfToken);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// Auth refresh
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }


    // Ignore refresh for health check
    if (originalRequest.skipAuthRefresh) {
      return Promise.reject(error);
    }


    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {

      originalRequest._retry = true;

      try {

        await refreshApi.post(
          "/accounts/token/refresh/"
        );

        return api(originalRequest);

      } catch (refreshError) {

        return Promise.reject(refreshError);

      }
    }


    return Promise.reject(error);
  }
);


export default api;