import styles from "./ServerDown.module.css";
import { MdCloudOff } from "react-icons/md";
import { useServerStatus } from "../../hooks/useServerStatus";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const ServerDown = () => {
  const navigate = useNavigate();
  const isUp = useServerStatus();
  const [searchParam] = useSearchParams();
  const nextPage = searchParam.get("nextPage");
  const handleRetry = () => {
    if (isUp) {
      navigate(`/${nextPage}`);
    }
  };

  useEffect(() => {
    if (isUp) {
      navigate(`/${nextPage}`);
    }
  }, [isUp]);

  return (
    <div className={styles.ServerDownContainer}>
      <div className={styles.card}>
        <MdCloudOff className={styles.icon} />
        <h1 className={styles.title}>Service Unavailable</h1>
        <p className={styles.message}>
          Oops! It looks like our servers are down. Please check back soon.
        </p>
        <button className={styles.button} onClick={handleRetry}>
          Retry
        </button>
      </div>
    </div>
  );
};

export default ServerDown;
