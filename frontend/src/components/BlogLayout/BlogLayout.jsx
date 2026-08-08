import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaBars, FaPlus } from "react-icons/fa";
import {
  MdArticle,
  MdEdit,
  MdMenuBook,
  MdPerson,
  MdLogout,
  MdSecurity,
} from "react-icons/md";

import styles from "./BlogLayout.module.css";
import fallbackLogo from "../../assets/logo.png";
import LogoutModal from "../../components/LogoutModal/LogoutModal";

import { useUser } from "../../Context/UserContext";
import { useSiteInfo } from "../../Context/SiteInfoContext";

const BlogLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { user, loading } = useUser();
  const { siteInfo } = useSiteInfo();

  useEffect(() => {
    if (!loading && !user?.isAuthenticated) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Determine current page for active sidebar item
  let currentPage = "blog";
  if (path.includes("/settings/security")) currentPage = "security";
  else if (path.includes("/settings")) currentPage = "settings";
  else if (path.includes("/post")) currentPage = "post";
  else if (path.includes("/add-post")) currentPage = "add-post";
  else if (path.includes("/account/edit")) currentPage = "edit-account";
  else if (path.includes("/account")) currentPage = "account";
  else if (path.includes("/security")) currentPage = "security";

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
    if (route) navigate(route);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading application...</p>
      </div>
    );
  }

  const avatarUrl = user?.profilePicture;
  const displayName = user?.fullName || user?.firstName || "Account";
  const brandName = siteInfo?.siteName || "BlogNet";
  const logoUrl = siteInfo?.siteLogoUrl || fallbackLogo;

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
            <img
              src={logoUrl}
              alt={`${brandName} Logo`}
              className={styles.logoImg}
            />
            <span className={styles.brandTitle}>{brandName}</span>
          </div>
        </div>

        <div
          className={styles.right}
          onClick={() => handleNavClick("/blog/account")}
        >
          <span className={styles.username}>{displayName}</span>
          <div className={styles.avatarWrapper}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User Avatar"
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {displayName[0].toUpperCase()}
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
                onClick={() => handleNavClick("/blog/security")}
                className={currentPage === "security" ? styles.currentPage : ""}
              >
                <MdSecurity className={styles.navIcon} />
                <span>Security</span>
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
          <Outlet />
        </main>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
      />
    </div>
  );
};

export default BlogLayout;
