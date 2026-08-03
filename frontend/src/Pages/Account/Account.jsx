import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { formatDistanceToNow, parseISO } from "date-fns";
import numeral from "numeral";
import {
  FaArrowLeft,
  FaHeart,
  FaComment,
  FaThLarge,
  FaRegNewspaper,
  FaUserEdit,
} from "react-icons/fa";
import UserContext from "../../context/UserContext";
import styles from "./Account.module.css";

const Account = ({ profileApiUrl = "http://127.0.0.1:8000/api/profile/" }) => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(UserContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const baseUrl = "http://127.0.0.1:8000";
    return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  const getReadableTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const formatCount = (count) =>
    numeral(count).format(count < 1000 ? "0a" : "0.0a");

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const targetUsername = username || currentUser?.username;

      if (!targetUsername) {
        setError("No user specified.");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("access");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await axios.get(`${profileApiUrl}${targetUsername}/`, {
          headers,
        });

        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching profile:", err?.response || err);
        setError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, currentUser, profileApiUrl]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.errorContainer}>
        <h2>Profile Not Found</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <FaArrowLeft /> Go Back
        </button>
      </div>
    );
  }

  const isSelf = currentUser?.username === profile.username;
  const avatar = getAssetUrl(profile.avatar);
  const initialLetter = (profile.display_name || profile.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className={styles.detailContainer}>
      <nav className={styles.navHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </nav>

      <header className={styles.profileHeader}>
        <div className={styles.avatarSection}>
          {avatar ? (
            <img
              src={avatar}
              alt={`${profile.display_name}'s avatar`}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>{initialLetter}</div>
          )}
        </div>

        <div className={styles.profileMeta}>
          <div className={styles.nameRow}>
            <h1 className={styles.displayName}>{profile.display_name}</h1>
            {isSelf && (
              <button
                className={styles.editBtn}
                onClick={() => navigate("/blog/account/edit")}
              >
                <FaUserEdit /> Edit
              </button>
            )}
          </div>
          <p className={styles.username}>@{profile.username}</p>

          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {profile.stats?.total_posts || 0}
              </span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {formatCount(profile.stats?.total_likes || 0)}
              </span>
              <span className={styles.statLabel}>Likes</span>
            </div>
          </div>
        </div>
      </header>

      <hr className={styles.divider} />

      <section className={styles.articlesSection}>
        <div className={styles.sectionHeader}>
          <h2>
            <FaRegNewspaper /> Articles by {profile.display_name}
          </h2>
        </div>

        {!profile.posts || profile.posts.length === 0 ? (
          <div className={styles.noPosts}>
            <FaThLarge className={styles.emptyIcon} />
            <p>No articles published yet.</p>
          </div>
        ) : (
          <div className={styles.postsGrid}>
            {profile.posts.map((post) => {
              const postCover = getAssetUrl(post.post_img);
              return (
                <div
                  key={post.id}
                  className={styles.postCard}
                  onClick={() => navigate(`/blog/post/${post.id}`)}
                >
                  {postCover && (
                    <div className={styles.cardImageFrame}>
                      <img src={postCover} alt={post.post_title} />
                    </div>
                  )}

                  <div className={styles.cardContent}>
                    {post.post_category && (
                      <span className={styles.categoryBadge}>
                        {post.post_category}
                      </span>
                    )}

                    <h3
                      className={styles.cardTitle}
                      style={
                        post.post_title_color
                          ? { color: post.post_title_color }
                          : {}
                      }
                    >
                      {post.post_title}
                    </h3>

                    <p className={styles.cardExcerpt}>
                      {post.post_body?.slice(0, 110)}
                      {post.post_body?.length > 110 ? "..." : ""}
                    </p>

                    <div className={styles.cardFooter}>
                      <span className={styles.timestamp}>
                        {getReadableTime(post.timestamp)}
                      </span>

                      <div className={styles.cardMetrics}>
                        <span>
                          <FaHeart className={styles.heartIcon} />{" "}
                          {formatCount(post.like)}
                        </span>
                        <span>
                          <FaComment className={styles.commentIcon} />{" "}
                          {post.comments_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Account;
