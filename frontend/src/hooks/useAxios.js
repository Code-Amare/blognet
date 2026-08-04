import axios from "axios";
import { useState, useEffect, useRef, useCallback } from "react";
import useRefresh from "./useRefresh";

const API_URL = import.meta.env.VITE_API_URL;

export const useAxios = ({
  method = "GET",
  url,
  data = null,
  run = true,
  isProtected = false,
  pollInterval = null,          // in milliseconds
  refreshOn401 = false,         // if true, auto‑refresh token on 401
  refreshUrl = null,            // optional, defaults to `${API_URL}/token/refresh/`
}) => {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);

  // Build refresh URL if not supplied
  const finalRefreshUrl = refreshUrl || `${API_URL}/token/refresh/`;
  const refreshToken = useRefresh(finalRefreshUrl);

  const fetchData = useCallback(async () => {
    if (!run) return;

    // Cancel any in‑flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const config = {
        method: method.toLowerCase(),
        url: `${API_URL}${url}`,
        data,
        signal: controller.signal,
      };

      if (isProtected) {
        const token = localStorage.getItem("access");
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }

      let res = await axios(config);
      setResponse(res.data);
    } catch (err) {
      if (axios.isCancel(err)) return; // ignore aborted requests

      // Auto‑refresh on 401 if enabled
      if (refreshOn401 && err.response?.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the original request with the new token
          try {
            const retryConfig = {
              method: method.toLowerCase(),
              url: `${API_URL}${url}`,
              data,
            };
            if (isProtected) {
              const newToken = localStorage.getItem("access");
              if (newToken) {
                retryConfig.headers = {
                  Authorization: `Bearer ${newToken}`,
                };
              }
            }
            const retryRes = await axios(retryConfig);
            setResponse(retryRes.data);
            return; // success – exit
          } catch (retryErr) {
            // fall through to error handling
            err = retryErr;
          }
        }
      }

      setError(err);
    } finally {
      setLoading(false);
    }
  }, [method, url, data, run, isProtected, refreshOn401, refreshToken]);

  // Set up polling and initial fetch
  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    fetchData();

    if (pollInterval && run) {
      timerRef.current = setInterval(fetchData, pollInterval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [fetchData, pollInterval, run]);

  return { response, error, loading };
};