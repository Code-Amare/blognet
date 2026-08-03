import React, { useState, useEffect } from "react";
import styles from "./Register.module.css";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import HomeNav from "../../components/HomeNav/HomeNav";

import FoodVisual from "../../assets/Hamburger.gif";
import EduVisual from "../../assets/Learning.gif";
import TechVisual from "../../assets/Robotarm.gif";

// Theme configuration: starts with Red (#FF5252)
const STATES = [
  { visualSrc: FoodVisual, color: "#FF5252" },
  { visualSrc: TechVisual, color: "#407BFF" },
  { visualSrc: EduVisual, color: "#22C55E" },
];

const Register = ({ interval = 8000 }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [index, setIndex] = useState(0);

  const navigate = useNavigate();

  // Preload visual assets to prevent display flickers
  useEffect(() => {
    STATES.forEach((state) => {
      const img = new Image();
      img.src = state.visualSrc;
    });
  }, []);

  // Theme auto-rotation timer
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATES.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  const current = STATES[index];

  // Helper to persist tokens & redirect
  const handleAuthSuccess = (data) => {
    if (data.access) {
      localStorage.setItem("access", data.access);
    }
    if (data.refresh) {
      localStorage.setItem("refresh", data.refresh);
    }
    navigate("/blog");
  };

  // Standard Registration Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await axios.post("http://127.0.0.1:8000/api/register/", {
        username,
        email,
        password,
      });

      // Navigate to login after successful standard registration
      navigate("/login");
    } catch (err) {
      console.error("Register Error:", err.response);
      const errorsObj = err.response?.data?.errors;

      if (typeof errorsObj === "string") {
        setGeneralError(errorsObj);
      } else if (typeof errorsObj === "object" && errorsObj !== null) {
        setFieldErrors(errorsObj);
      } else {
        setGeneralError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth Registration Handler
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGeneralError("");
      setFieldErrors({});
      setIsGoogleSubmitting(true);

      try {
        const res = await axios.post(
          "http://127.0.0.1:8000/api/google/register/",
          {
            token: tokenResponse.access_token,
          },
        );

        // Google registration creates user & authenticates directly
        handleAuthSuccess(res.data);
      } catch (err) {
        console.error("Google Register Error:", err.response);
        const errorMsg =
          err.response?.data?.errors || err.response?.data?.error;

        if (typeof errorMsg === "string") {
          setGeneralError(errorMsg);
        } else {
          setGeneralError("Google Sign-Up failed. Please try again.");
        }
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    onError: (errorResponse) => {
      console.error("Google Authorization Error:", errorResponse);
      setGeneralError("Google registration authorization failed.");
    },
  });

  return (
    <div
      className={styles.registerContainer}
      style={{
        "--accent-color": current.color,
      }}
    >
      <HomeNav
        currentPage="signUp"
        isHomePage={false}
        bgColor={current.color}
      />

      <main className={styles.mainWrapper}>
        <section className={styles.formSection}>
          <div className={styles.formCard}>
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>Join BlogNet today</p>

            {/* Top-Level General Error Alert Banner */}
            {generalError && (
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
                <span>{generalError}</span>
              </div>
            )}

            {/* Google Sign-Up Button */}
            <button
              type="button"
              className={styles.googleBtn}
              onClick={() => handleGoogleRegister()}
              disabled={isSubmitting || isGoogleSubmitting}
            >
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>
                {isGoogleSubmitting
                  ? "Connecting to Google..."
                  : "Sign up with Google"}
              </span>
            </button>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerLine}></span>
              <span className={styles.dividerText}>or register with email</span>
              <span className={styles.dividerLine}></span>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {/* Username Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="username" className={styles.label}>
                  Username
                </label>
                <input
                  className={`${styles.input} ${
                    fieldErrors.username ? styles.inputError : ""
                  }`}
                  type="text"
                  id="username"
                  placeholder="Choose a username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {fieldErrors.username && (
                  <span className={styles.fieldError}>
                    {fieldErrors.username.join(" ")}
                  </span>
                )}
              </div>

              {/* Email Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  className={`${styles.input} ${
                    fieldErrors.email ? styles.inputError : ""
                  }`}
                  type="email"
                  id="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldErrors.email && (
                  <span className={styles.fieldError}>
                    {fieldErrors.email.join(" ")}
                  </span>
                )}
              </div>

              {/* Password Input */}
              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <input
                  className={`${styles.input} ${
                    fieldErrors.password ? styles.inputError : ""
                  }`}
                  type="password"
                  id="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {fieldErrors.password && (
                  <span className={styles.fieldError}>
                    {fieldErrors.password.join(" ")}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={
                  !username ||
                  !email ||
                  !password ||
                  isSubmitting ||
                  isGoogleSubmitting
                }
              >
                {isSubmitting ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <p className={styles.footerText}>
              Already have an account?{" "}
              <Link className={styles.link} to="/login">
                Sign In here
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

export default Register;
