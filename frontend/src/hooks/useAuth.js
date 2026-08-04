// hooks/useAuth.js
import { useState, useEffect } from "react";
import { useAxios } from "./useAxios";

function useAuth(checkUrl, refreshUrl) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);

  // Only run the check if we have an access token
  const hasToken = !!localStorage.getItem("access");

  const { response, error, loading: axiosLoading } = useAxios({
    method: "GET",
    url: checkUrl,
    isProtected: true,
    refreshOn401: true,      // automatically refresh token on 401
    refreshUrl,              // pass the refresh endpoint to useAxios
    run: hasToken,
  });

  // Update auth state based on the response / error from the check
  useEffect(() => {
    if (axiosLoading) {
      setLoading(true);
      return;
    }

    if (response) {
      // Assumes your API returns user data in the response
      setUser(response.user || {});
      setIsAuthenticated(true);
      setLoading(false);
    } else if (error) {
      // Token invalid, refresh failed, or network error → not authenticated
      setIsAuthenticated(false);
      setUser({});
      setLoading(false);
    }
  }, [response, error, axiosLoading]);

  // Handle case where no token exists at all
  useEffect(() => {
    if (!hasToken) {
      setIsAuthenticated(false);
      setUser({});
      setLoading(false);
    }
  }, [hasToken]);

  return { isAuthenticated, loading, user };
}

export default useAuth;