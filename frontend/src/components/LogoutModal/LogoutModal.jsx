import React, { useEffect } from "react";
import { MdLogout } from "react-icons/md";
import styles from "./LogoutModal.module.css";

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
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
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
