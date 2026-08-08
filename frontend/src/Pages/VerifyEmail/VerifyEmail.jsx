import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import HomeNav from "../../components/HomeNav/HomeNav";
import api from "../../hooks/api";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./VerifyEmail.module.css";

import FoodVisual from "../../assets/Hamburger.gif";
import EduVisual from "../../assets/Learning.gif";
import TechVisual from "../../assets/Robotarm.gif";

const STATES = [
  { visualSrc: FoodVisual, color: "#FF5252" },
  { visualSrc: TechVisual, color: "#407BFF" },
  { visualSrc: EduVisual, color: "#22C55E" },
];

const VerifyEmail = ({ interval = 8000 }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePageTitle } = usePageTitle();

  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [index, setIndex] = useState(0);

  const codeInputRef = useRef(null);

  useEffect(() => {
    // Preload images to prevent flickering (matches Login logic)
    STATES.forEach((state) => {
      const img = new Image();
      img.src = state.visualSrc;
    });
    updatePageTitle("Verify Email");
  }, [updatePageTitle]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATES.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

  const current = STATES[index];

  const handleVerify = async (e) => {
    e.preventDefault();
    setFieldError("");

    if (!email) {
      toast.error("Email address is missing.");
      return;
    }

    if (!code || code.length < 6) {
      setFieldError("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/user/email/verify/", {
        email,
        code,
      });

      toast.success(response.data.detail || "Email verified successfully!");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      const data = error.response?.data;
      const msg = data?.error || data?.detail || "Invalid verification code.";
      toast.error(msg);
      if (data?.remaining_attempts !== undefined) {
        setFieldError(
          `Invalid code. ${data.remaining_attempts} attempts left.`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendCode = async () => {
    setFieldError("");

    if (!email) {
      toast.error("Email address is missing.");
      return;
    }

    setResending(true);

    try {
      const response = await api.post("/user/send-otp/", { email });
      toast.success(response.data.detail || "Verification code resent.");
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Unable to resend code.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className={styles.verifyContainer}
      style={{ "--accent-color": current.color }}
    >
      <HomeNav
        currentPage="verify"
        isHomePage={false}
        bgColor={current.color}
      />

      <main className={styles.mainWrapper}>
        <section className={styles.formSection}>
          <div className={styles.formCard}>
            <div className={styles.headerBack}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => navigate(-1)}
              >
                <FiArrowLeft />
                <span>Back</span>
              </button>
            </div>

            <h1 className={styles.title}>Verify Email</h1>
            <p className={styles.subtitle}>
              Enter the 6‑digit code sent to{" "}
              {email ? (
                <span className={styles.emailHighlight}>{email}</span>
              ) : (
                "your email"
              )}
            </p>

            <form onSubmit={handleVerify} className={styles.form} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="code" className={styles.label}>
                  Verification Code
                </label>
                <input
                  ref={codeInputRef}
                  id="code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (fieldError) setFieldError("");
                  }}
                  disabled={isLoading}
                  className={`${styles.input} ${styles.codeInput} ${
                    fieldError ? styles.inputError : ""
                  }`}
                />
                {fieldError && (
                  <span className={styles.fieldError}>{fieldError}</span>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading || !code || code.length < 6}
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>
            </form>

            <p className={styles.footerText}>
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={resendCode}
                disabled={resending}
                className={styles.linkBtn}
              >
                {resending ? "Sending..." : "Resend Code"}
              </button>
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

export default VerifyEmail;
