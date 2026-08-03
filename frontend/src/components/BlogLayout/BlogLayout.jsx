import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
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

const BlogLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Logout Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [avatar, setAvatar] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState({});

  const { isAuthenticated, loading, user } = useAuth(
    "http://127.0.0.1:8000/api/token/check/",
    "http://127.0.0.1:8000/api/token/refresh/",
  );

  let currentPage = "blog";
  if (path.includes("/post")) currentPage = "post";
  else if (path.includes("/add-post")) currentPage = "add-post";
  else if (path.includes("/account/edit")) currentPage = "edit-account";
  else if (path.includes("/account")) currentPage = "account";

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchAvatar = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/profile/", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        });
        setAvatar(res.data.avatar);
        setDisplayName(res.data.display_name);
        setProfile(res.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchAvatar();
  }, [loading, isAuthenticated, navigate]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const nextState = !prev;
      localStorage.setItem("sidebarOpen", JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    navigate("/logout");
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading application...</p>
      </div>
    );
  }

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
          <div className={styles.brand} onClick={() => navigate("/blog")}>
            <img src={Logo} alt="BlogNet Logo" className={styles.logoImg} />
            <span className={styles.brandTitle}>BlogNet</span>
          </div>
        </div>

        <div className={styles.right} onClick={() => navigate("/blog/account")}>
          <span className={styles.username}>
            {displayName || user?.username || "Account"}
          </span>
          <div className={styles.avatarWrapper}>
            {avatar ? (
              <img
                src={
                  avatar.startsWith("http")
                    ? avatar
                    : `http://127.0.0.1:8000${avatar}`
                }
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
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={`${styles.slideNav} ${
            !isSidebarOpen ? styles.closed : ""
          }`}
        >
          <div className={styles.actionWrapper}>
            <button
              onClick={() => navigate("/blog/add-post/")}
              className={styles.addPostBtn}
            >
              <FaPlus className={styles.btnIcon} />
              <span>New Article</span>
            </button>
          </div>

          <nav className={styles.navList}>
            <ul>
              <li
                onClick={() => navigate("/blog")}
                className={currentPage === "blog" ? styles.currentPage : ""}
              >
                <MdMenuBook className={styles.navIcon} />
                <span>Read Blog</span>
              </li>

              <li
                onClick={() => navigate("/blog/post")}
                className={currentPage === "post" ? styles.currentPage : ""}
              >
                <MdArticle className={styles.navIcon} />
                <span>My Posts</span>
              </li>

              <li
                onClick={() => navigate("/blog/account")}
                className={currentPage === "account" ? styles.currentPage : ""}
              >
                <MdPerson className={styles.navIcon} />
                <span>Profile</span>
              </li>

              <li
                onClick={() => navigate("/blog/account/edit")}
                className={
                  currentPage === "edit-account" ? styles.currentPage : ""
                }
              >
                <MdEdit className={styles.navIcon} />
                <span>Edit Account</span>
              </li>

              {/* Triggers Modal */}
              <li
                onClick={() => setShowLogoutModal(true)}
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

      {/* Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default BlogLayout;
