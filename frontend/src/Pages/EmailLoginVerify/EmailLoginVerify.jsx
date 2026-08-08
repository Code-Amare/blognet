import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

import api from "../../hooks/api";
import { useSiteInfo } from "../../Context/SiteInfoContext";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./EmailLoginVerify.module.css";
import { useUser } from "../../Context/UserContext";

const EmailLoginVerify = () => {
  const navigate = useNavigate();
  const { code } = useParams();

  const siteInfoContext = useSiteInfo();
  const siteInfo = siteInfoContext?.siteInfo || {};
  const { updatePageTitle } = usePageTitle();
  const { getUser } = useUser();

  const [status, setStatus] = useState("checking"); // 'checking', 'success', 'error'
  const [message, setMessage] = useState("");

  // Use a ref to track if the request has already been made
  const hasRequested = useRef(false);

  useEffect(() => {
    if (updatePageTitle) {
      updatePageTitle("Verifying Login");
    }
  }, [updatePageTitle]);

  useEffect(() => {
    const verifyLoginLink = async () => {
      if (!code) {
        setStatus("error");
        setMessage("Invalid or missing login link.");
        return;
      }

      // If the request has already been initiated, exit early
      if (hasRequested.current) return;
      hasRequested.current = true;

      try {
        // Send the POST request to the endpoint you provided
        const response = await api.post(`/user/login/email/verify/${code}/`, {
          skipAuthRefresh: true,
        });

        setStatus("success");
        setMessage("Login successful! Redirecting...");

        getUser();

        // Add a slight delay so the user can read the success message
        setTimeout(() => {
          navigate("/blog");
        }, 1500);
      } catch (error) {
        setStatus("error");
        const responseData = error.response?.data;
        setMessage(
          responseData?.error ||
            responseData?.detail ||
            "Invalid or expired login link. Please request a new one.",
        );
      }
    };

    verifyLoginLink();
  }, [code, navigate]);

  return (
    <div className={styles.pageWrapper}>
      <button
        type="button"
        onClick={() => navigate("/login")}
        className={styles.backBtn}
        aria-label="Back to home"
      >
        <FiArrowLeft />
      </button>

      <main className={styles.cardSection}>
        <div className={styles.card}>
          <div className={styles.header}>
            {siteInfo?.siteLogoUrl && (
              <div
                className={styles.logoIcon}
                style={{
                  maskImage: `url(${siteInfo.siteLogoUrl})`,
                  WebkitMaskImage: `url(${siteInfo.siteLogoUrl})`,
                }}
                role="img"
                aria-label={`${siteInfo.siteName || "Site"} Logo`}
              />
            )}
            <h1 className={styles.heading}>Secure Login</h1>
            <p className={styles.subheading}>
              Verifying your magic link to sign you in safely.
            </p>
          </div>

          {status === "checking" && (
            <div className={styles.infoBanner} role="status">
              Verifying your secure login link... Please wait.
            </div>
          )}

          {status === "error" && (
            <div className={styles.errorBanner} role="alert">
              {message}
            </div>
          )}

          {status === "success" && (
            <div className={styles.successBanner} role="status">
              {message}
            </div>
          )}

          <p className={styles.footerText}>
            Need to sign in another way?{" "}
            <Link className={styles.link} to="/login">
              Go to Login
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default EmailLoginVerify;
