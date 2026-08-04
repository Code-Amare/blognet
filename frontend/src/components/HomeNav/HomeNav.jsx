// components/HomeNav/HomeNav.js
import styles from "./HomeNav.module.css";
import Logo from "../../assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { useEffect } from "react";

const HomeNav = ({ currentPage, isHomePage = true, bgColor }) => {
  const navigate = useNavigate();

  // Use relative paths – the base URL comes from VITE_API_URL
  const { isAuthenticated, loading } = useAuth(
    "/token/check/", // was: "http://127.0.0.1:8000/api/token/check/"
    "/token/refresh/", // was: "http://127.0.0.1:8000/api/token/refresh/"
  );

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      navigate("/blog");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return <div className={styles.loadingPlaceholder}>Loading...</div>;
  }

  return (
    <header
      className={styles.HomeNavContainer}
      style={{ backgroundColor: bgColor }}
    >
      <div className={styles.left} onClick={() => navigate("/")}>
        <img src={Logo} alt="BlogNet Logo" className={styles.logoImg} />
        <h1 className={styles.brandTitle}>BlogNet</h1>
      </div>

      <nav className={styles.right}>
        <Link
          to="/login"
          className={`${styles.navLink} ${
            currentPage === "signIn" ? styles.currentPage : ""
          }`}
        >
          Sign In
        </Link>
        <Link
          to="/Register"
          className={`${styles.navLink} ${styles.signUpBtn} ${
            currentPage === "signUp" ? styles.currentPage : ""
          }`}
        >
          Sign Up
        </Link>
      </nav>
    </header>
  );
};

export default HomeNav;
