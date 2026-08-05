import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSiteInfo } from "../../Context/SiteInfoContext";
import { useUser } from "../../Context/UserContext";
import styles from "./HomeNav.module.css";

const HomeNav = ({ currentPage, bgColor, isSticky = true }) => {
  const navigate = useNavigate();
  const siteInfoContext = useSiteInfo();
  const siteInfo = siteInfoContext?.siteInfo || {};

  const { user = null, loading = false } = useUser() || {};

  useEffect(() => {
    if (!loading && user?.isAuthenticated) {
      navigate("/blog");
    }
  }, [user?.isAuthenticated, loading, navigate]);

  // Determine positioning class based on the prop
  const positionClass = isSticky ? styles.stickyNav : styles.normalNav;

  if (loading) {
    return (
      <div
        className={`${styles.loadingPlaceholder} ${positionClass}`}
        style={{ backgroundColor: bgColor }}
      >
        <span className={styles.loader}></span>
      </div>
    );
  }

  return (
    <header
      className={`${styles.navbar} ${positionClass}`}
      style={{ backgroundColor: bgColor }}
    >
      <div className={styles.brand} onClick={() => navigate("/")}>
        {siteInfo?.siteLogoUrl && (
          <img
            src={siteInfo.siteLogoUrl}
            alt={`${siteInfo.siteName || "Site"} Logo`}
            className={styles.logo}
          />
        )}
        <h1 className={styles.brandName}>{siteInfo?.siteName || "BlogNet"}</h1>
      </div>

      <nav className={styles.navLinks}>
        <Link
          to="/login"
          className={`${styles.link} ${
            currentPage === "signIn" ? styles.activeLink : ""
          }`}
        >
          Sign In
        </Link>
        <Link
          to="/Register"
          className={`${styles.link} ${styles.signUpBtn} ${
            currentPage === "signUp" ? styles.activeLink : ""
          }`}
        >
          Sign Up
        </Link>
      </nav>
    </header>
  );
};

export default HomeNav;
