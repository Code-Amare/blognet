import styles from "./ServerDown.module.css";

import { MdCloudOff } from "react-icons/md";

import { useNavigate, useSearchParams } from "react-router-dom";

import { useEffect } from "react";

import { useServerStatus } from "../../hooks/useServerStatus";

const ServerDown = () => {
  const navigate = useNavigate();

  const isUp = useServerStatus();

  const [searchParams] = useSearchParams();

  const redirect = () => {
    if (!isUp) {
      return;
    }

    const nextPage = searchParams.get("nextPage");

    const destination = nextPage ? decodeURIComponent(nextPage) : "/";

    navigate(destination, {
      replace: true,
    });
  };

  useEffect(() => {
    redirect();
  }, [isUp]);

  return (
    <div className={styles.ServerDownContainer}>
      <div className={styles.card}>
        <MdCloudOff className={styles.icon} />

        <h1 className={styles.title}>Service Unavailable</h1>

        <p className={styles.message}>
          Oops! It looks like our servers are down. Please check back soon.
        </p>

        <button className={styles.button} onClick={redirect} disabled={!isUp}>
          {isUp ? "Retry" : "Checking..."}
        </button>
      </div>
    </div>
  );
};

export default ServerDown;
