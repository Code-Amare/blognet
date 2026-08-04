import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaPlus } from "react-icons/fa";
import {
  MdArticle,
  MdEdit,
  MdMenuBook,
  MdPerson,
  MdLogout,
} from "react-icons/md";

import styles from "./BlogLayout.module.css";
import Logo from "../../assets/logo.png";
import useAuth from "../../hooks/useAuth";
import UserContext from "../../context/UserContext";
import LogoutModal from "../../components/LogoutModal/LogoutModal";
import { useAxios } from "../../hooks/useAxios";

// Base API URL from environment variables
const API_BASE = import.meta.env.VITE_API_URL;

const BlogLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState({});

  // ---- Use relative URLs – the base comes from VITE_API_URL ----
  const {
    isAuthenticated,
    loading: authLoading,
    user,
  } = useAuth(
    "/token/check/", // was absolute
    "/token/refresh/", // was absolute
  );

  // Fetch profile only when authenticated and auth loading is done
  const {
    response: profileData,
    loading: profileLoading,
    error: profileError,
  } = useAxios({
    method: "GET",
    url: "/profile/",
    isProtected: true,
    run: isAuthenticated && !authLoading,
  });

  // Update local state when profile data arrives
  useEffect(() => {
    if (profileData) {
      setAvatar(profileData.avatar);
      setDisplayName(profileData.display_name);
      setProfile(profileData);
    }
  }, [profileData]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // ---- Helper to build full image URLs ----
  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    // Use the same base as the hook (or fallback)
    const base = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8000";
    const newPath = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;

    return newPath;
  };

  let currentPage = "blog";
  if (path.includes("/post")) currentPage = "post";
  else if (path.includes("/add-post")) currentPage = "add-post";
  else if (path.includes("/account/edit")) currentPage = "edit-account";
  else if (path.includes("/account")) currentPage = "account";

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const nextState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleNavClick = (route) => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
      localStorage.setItem("sidebarOpen", JSON.stringify(false));
    }
    if (route) {
      navigate(route);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    navigate("/logout");
  };

  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading application...</p>
      </div>
    );
  }

  const avatarUrl = getAssetUrl(avatar);

  return (
    <div className={styles.blogLayoutContainer}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.left}>
          <button
            className={styles.menuBtn}
            onClick={toggleSidebar}
            aria-label="Toggle navigation drawer"
          >
            <FaBars />
          </button>
          <div className={styles.brand} onClick={() => handleNavClick("/blog")}>
            <img src={Logo} alt="BlogNet Logo" className={styles.logoImg} />
            <span className={styles.brandTitle}>BlogNet</span>
          </div>
        </div>

        <div
          className={styles.right}
          onClick={() => handleNavClick("/blog/account")}
        >
          <span className={styles.username}>
            {displayName || user?.username || "Account"}
          </span>
          <div className={styles.avatarWrapper}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User Avatar"
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {(displayName || user?.username || "U")[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className={styles.mainWrapper}>
        {isSidebarOpen && (
          <div
            className={styles.mobileBackdrop}
            onClick={() => handleNavClick()}
          />
        )}

        <aside
          className={`${styles.slideNav} ${
            !isSidebarOpen ? styles.closed : ""
          }`}
        >
          <div className={styles.actionWrapper}>
            <button
              onClick={() => handleNavClick("/blog/add-post/")}
              className={styles.addPostBtn}
            >
              <FaPlus className={styles.btnIcon} />
              <span>New Article</span>
            </button>
          </div>

          <nav className={styles.navList}>
            <ul>
              <li
                onClick={() => handleNavClick("/blog")}
                className={currentPage === "blog" ? styles.currentPage : ""}
              >
                <MdMenuBook className={styles.navIcon} />
                <span>Read Blog</span>
              </li>

              <li
                onClick={() => handleNavClick("/blog/post")}
                className={currentPage === "post" ? styles.currentPage : ""}
              >
                <MdArticle className={styles.navIcon} />
                <span>My Posts</span>
              </li>

              <li
                onClick={() => handleNavClick("/blog/account")}
                className={currentPage === "account" ? styles.currentPage : ""}
              >
                <MdPerson className={styles.navIcon} />
                <span>Profile</span>
              </li>

              <li
                onClick={() => handleNavClick("/blog/account/edit")}
                className={
                  currentPage === "edit-account" ? styles.currentPage : ""
                }
              >
                <MdEdit className={styles.navIcon} />
                <span>Edit Account</span>
              </li>

              <li
                onClick={() => {
                  handleNavClick();
                  setShowLogoutModal(true);
                }}
                className={styles.logoutItem}
              >
                <MdLogout className={styles.navIcon} />
                <span>Logout</span>
              </li>
            </ul>
          </nav>
        </aside>

        <main className={styles.content}>
          <UserContext.Provider value={{ user, profile }}>
            <Outlet />
          </UserContext.Provider>
        </main>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default BlogLayout;
