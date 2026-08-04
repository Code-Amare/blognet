import { useAxios } from "./useAxios";

export const useServerStatus = (
  url = "/health/",
  intervalMs = 10000
) => {
  const { response, error, loading } = useAxios({
    method: "GET",
    url,
    run: true,
    isProtected: false,
    pollInterval: intervalMs,
  });

  if (loading || (!response && !error)) return null;
  return response?.status === "ok";
};