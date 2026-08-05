import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./ForgotPassword.module.css";
import HomeNav from "../../components/HomeNav/HomeNav";
import api from "../../hooks/api";
import { usePageTitle } from "../../Context/PageTitleContext";

// Visual Assets
import FoodVisual from "../../assets/Hamburger.gif";
import EduVisual from "../../assets/Learning.gif";
import TechVisual from "../../assets/Robotarm.gif";

const STATES = [
  { visualSrc: FoodVisual, color: "#FF5252" },
  { visualSrc: TechVisual, color: "#407BFF" },
  { visualSrc: EduVisual, color: "#22C55E" },
];

const ForgotPassword = ({ interval = 8000 }) => {
  const { updatePageTitle } = usePageTitle();
  const emailInputRef = useRef(null);

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [index, setIndex] = useState(0);

  // Update Page Title
  useEffect(() => {
    updatePageTitle("Forgot Password");
  }, [updatePageTitle]);

  // Auto-focus input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Preload Images
  useEffect(() => {
    STATES.forEach((state) => {
      const img = new Image();
      img.src = state.visualSrc;
    });
  }, []);

  // Handle Cycling
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATES.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  const current = STATES[index];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    setSuccess("");
    setIsLoading(true);

    try {
      // Using the user/ endpoint as requested
      const response = await api.post("/user/forgot-password/", { email });
      setSuccess(
        response.data.detail ||
          "If this email exists, a password reset link has been sent.",
      );
      setEmail("");
    } catch (error) {
      const responseData = error.response?.data;
      setErrors({
        general:
          responseData?.error ||
          responseData?.detail ||
          "Something went wrong. Please try again.",
        email: responseData?.email,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={styles.loginContainer}
      style={{
        "--accent-color": current.color,
      }}
    >
      <HomeNav
        currentPage="forgotPassword"
        isHomePage={false}
        bgColor={current.color}
      />

      <main className={styles.mainWrapper}>
        <section className={styles.formSection}>
          <div className={styles.formCard}>
            <h1 className={styles.title}>Forgot Password</h1>
            <p className={styles.subtitle}>
              Enter your email and we'll send you a password reset link.
            </p>

            {errors.general && (
              <div className={styles.errorBanner} role="alert">
                <svg
                  className={styles.errorIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errors.general}</span>
              </div>
            )}

            {success && (
              <div className={styles.successBanner} role="status">
                <svg
                  className={styles.successIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  className={`${styles.input} ${
                    errors.email || errors.general ? styles.inputError : ""
                  }`}
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className={styles.fieldError}>
                    {Array.isArray(errors.email)
                      ? errors.email[0]
                      : errors.email}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!email || isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <p className={styles.footerText}>
              Remember your password?{" "}
              <Link className={styles.link} to="/login">
                Sign in here
              </Link>
            </p>
          </div>
        </section>

        <section className={styles.visualSection}>
          <div className={styles.visualWrapper}>
            <img
              src={current.visualSrc}
              alt="Category Visual"
              className={styles.visualImg}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default ForgotPassword;
