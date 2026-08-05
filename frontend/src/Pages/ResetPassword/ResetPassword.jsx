import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";

import api from "../../hooks/api";
import { useSiteInfo } from "../../Context/SiteInfoContext";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./ResetPassword.module.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { code } = useParams();

  // Guard against null context during initial render
  const siteInfoContext = useSiteInfo();
  const siteInfo = siteInfoContext?.siteInfo || {};

  const { updatePageTitle } = usePageTitle();
  const passwordInputRef = useRef(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [checkingCode, setCheckingCode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  // Update Page Title
  useEffect(() => {
    if (updatePageTitle) {
      updatePageTitle("Reset Password");
    }
  }, [updatePageTitle]);

  // Validate the reset token/code on mount
  useEffect(() => {
    const checkResetCode = async () => {
      if (!code) {
        setErrors({ general: "Invalid reset link." });
        setCheckingCode(false);
        return;
      }

      try {
        await api.post("/user/password/reset/check/", { code });
        setIsCodeValid(true);

        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 100);
      } catch (error) {
        setErrors({
          general:
            error.response?.data?.error ||
            error.response?.data?.detail ||
            "Invalid or expired reset link.",
        });
        setIsCodeValid(false);
      } finally {
        setCheckingCode(false);
      }
    };

    checkResetCode();
  }, [code]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setSuccess("");

    if (!isCodeValid) {
      setErrors({ general: "Invalid or expired reset link." });
      return;
    }

    if (!password.trim()) {
      setErrors({ password: "Password is required." });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(`/user/password/reset/${code}/`, {
        password,
      });

      setSuccess(
        response.data?.detail || "Password reset successfully! Redirecting...",
      );

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      const responseData = error.response?.data;
      setErrors({
        general:
          responseData?.error ||
          responseData?.detail ||
          "Something went wrong. Please try again.",
        password: responseData?.password,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <button
        type="button"
        onClick={() => navigate("/")}
        className={styles.backBtn}
        aria-label="Back to home"
      >
        <FiArrowLeft />
      </button>

      <div className={styles.card}>
        <div className={styles.header}>
          {siteInfo.siteLogoUrl && (
            <div className={styles.logoWrapper}>
              <img
                src={siteInfo.siteLogoUrl}
                alt={`${siteInfo.siteName || "Site"} Logo`}
                className={styles.logoImg}
              />
            </div>
          )}
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Create a new secure password for your account.
          </p>
        </div>

        {checkingCode && (
          <div className={styles.infoBanner} role="status">
            Checking reset link...
          </div>
        )}

        {errors.general && (
          <div className={styles.errorBanner} role="alert">
            {errors.general}
          </div>
        )}

        {success && (
          <div className={styles.successBanner} role="status">
            {success}
          </div>
        )}

        {isCodeValid && (
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.inputGroup}>
              <label htmlFor="new-password" className={styles.label}>
                New Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="new-password"
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={isLoading}
                  className={`${styles.input} ${
                    errors.password ? styles.inputError : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.toggleVisibilityBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && (
                <p className={styles.fieldError}>
                  {Array.isArray(errors.password)
                    ? errors.password[0]
                    : errors.password}
                </p>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirm-password" className={styles.label}>
                Confirm Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                  className={`${styles.input} ${
                    errors.confirmPassword ? styles.inputError : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.toggleVisibilityBtn}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className={styles.fieldError}>{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className={styles.submitBtn}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p className={styles.footerText}>
          Back to{" "}
          <Link className={styles.link} to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
