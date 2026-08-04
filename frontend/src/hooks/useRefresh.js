import { useCallback } from "react";
import axios from "axios";

export default function useRefresh(refreshUrl) {
  return useCallback(async () => {
    const token = localStorage.getItem("refresh");
    if (!token) return false;

    try {
      const { data } = await axios.post(refreshUrl, { refresh: token });
      localStorage.setItem("access", data.access);
      return true;
    } catch {
      return false;
    }
  }, [refreshUrl]);
}