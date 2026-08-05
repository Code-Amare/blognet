import React, { useEffect, useState } from "react";
import { MdLogout } from "react-icons/md";
import { useUser } from "../../Context/UserContext";
import styles from "./LogoutModal.module.css";

const LogoutModal = ({ isOpen, onClose }) => {
  const { logout } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout(); // calls /user/logout/ and clears user state
    } catch (error) {
      console.error("Logout failed:", error);
      // Optionally show an error message
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrapper}>
          <MdLogout className={styles.logoutIcon} />
        </div>

        <h2 className={styles.title}>Confirm Logout</h2>
        <p className={styles.message}>
          Are you sure you want to log out of your account? You will need to
          sign back in to access your posts.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isLoggingOut}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
