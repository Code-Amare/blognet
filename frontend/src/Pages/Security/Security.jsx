// src/pages/Security/Security.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaKey,
  FaShieldAlt,
  FaSave,
  FaTrash,
  FaExclamationTriangle,
} from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../../hooks/api";
import { useUser } from "../../Context/UserContext";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./Security.module.css";

const Security = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { updatePageTitle } = usePageTitle();

  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    updatePageTitle("Security");
  }, [updatePageTitle]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/user/2fa/status/");
        setTwoFactorEnabled(res.data.is_twofa_enabled);
      } catch {
        toast.error("Failed to load security settings.");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  // ---- Password ----
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    try {
      await api.post("/user/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to change password.");
    }
  };

  // ---- 2FA ----
  const toggleTwoFactor = async () => {
    try {
      const res = await api.post("/user/2fa/toggle/");
      setTwoFactorEnabled(res.data.is_twofa_enabled);
      toast.success(
        `2FA ${res.data.is_twofa_enabled ? "enabled" : "disabled"}.`,
      );
    } catch {
      toast.error("Failed to toggle 2FA.");
    }
  };

  // ---- Delete Account ----
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete("/user/me/delete/");
      toast.success("Account deleted successfully.");
      setUser(null); // clear user context
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate("/");
        window.location.reload(); // ensure full reset
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete account.";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.detailContainer}>
      <nav className={styles.navHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </nav>

      <div className={styles.formHeader}>
        <h1>Security</h1>
        <p>Manage your password, two‑factor authentication, and account</p>
      </div>

      {/* Password */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaKey className={styles.sectionIcon} /> Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className={styles.editForm}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.rowGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>
          </div>
          <div className={styles.formFooter}>
            <button type="submit" className={styles.saveBtn}>
              <FaSave /> Update Password
            </button>
          </div>
        </form>
      </section>

      <hr className={styles.divider} />

      {/* 2FA */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaShieldAlt className={styles.sectionIcon} /> Two‑Factor
          Authentication
        </h2>
        <div className={styles.twofaControl}>
          <span>
            Status: <strong>{twoFactorEnabled ? "Enabled" : "Disabled"}</strong>
          </span>
          <button
            className={`${styles.saveBtn} ${twoFactorEnabled ? styles.dangerBtn : ""}`}
            onClick={toggleTwoFactor}
          >
            {twoFactorEnabled ? "Disable" : "Enable"} 2FA
          </button>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* Delete Account */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FaTrash
            className={styles.sectionIcon}
            style={{ color: "var(--color-error-text)" }}
          />{" "}
          Delete Account
        </h2>
        <p className={styles.dangerText}>
          This action is irreversible. All your data will be permanently
          removed.
        </p>
        <button
          className={styles.dangerBtn}
          onClick={() => setShowDeleteModal(true)}
        >
          Delete My Account
        </button>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <FaExclamationTriangle className={styles.modalIcon} />
              <h3>Are you absolutely sure?</h3>
            </div>
            <p className={styles.modalText}>
              This action <strong>cannot be undone</strong>. This will
              permanently delete your account and all associated data (posts,
              comments, likes, etc.).
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.dangerBtn}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Security;
