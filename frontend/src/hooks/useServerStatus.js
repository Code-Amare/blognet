import { useEffect, useRef, useState } from "react";
import api from "./api";

export const useServerStatus = (
  url = "/health/",
  intervalMs = 10000
) => {
  const [status, setStatus] = useState(null);

  const timerRef = useRef(null);
  const mountedRef = useRef(true);


  useEffect(() => {
    mountedRef.current = true;


    const checkServer = async () => {
      try {
        const response = await api.get(url, {
          skipAuthRefresh: true,
        });


        if (!mountedRef.current) return;


        setStatus(
          response.data?.status === "ok"
        );


      } catch (error) {

        if (!mountedRef.current) return;

        setStatus(false);

      }


      if (mountedRef.current) {
        timerRef.current = setTimeout(
          checkServer,
          intervalMs
        );
      }
    };


    checkServer();


    return () => {
      mountedRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };

  }, [url, intervalMs]);


  return status;
};