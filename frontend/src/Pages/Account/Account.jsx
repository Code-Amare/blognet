import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { useUser } from "../../Context/UserContext";
import { usePageTitle } from "../../Context/PageTitleContext";
import api from "../../hooks/api";
import styles from "./Account.module.css";

const Account = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { updatePageTitle } = usePageTitle();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use the user ID from the URL, or fall back to the current logged-in user’s ID
  let targetUserId = null;
  useEffect(() => {}, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/blog/profile/${user.id}/`);
        const data = response.data; // shape: { id, full_name, profile_picture, date_joined, stats, posts, ... }
        console.log(data);
        setProfile(data);
        updatePageTitle(data.full_name || "Profile");
        console.log(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, updatePageTitle]);

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

  const isSelf = user?.id === profile.id;
  const avatar = profile.profile_picture || null; // already a full Cloudinary URL
  const initialLetter = (profile.full_name || "?").charAt(0).toUpperCase();

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
              alt={`${profile.full_name}'s avatar`}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>{initialLetter}</div>
          )}
        </div>

        <div className={styles.profileMeta}>
          <div className={styles.nameRow}>
            <h1 className={styles.displayName}>{profile.full_name}</h1>
            {isSelf && (
              <button
                className={styles.editBtn}
                onClick={() => navigate("/blog/account/edit")}
              >
                <FaUserEdit /> Edit
              </button>
            )}
          </div>
          {/* optionally show email or date_joined */}
          <p className={styles.secondaryInfo}>
            Member since {getReadableTime(profile.date_joined)}
          </p>

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
            <FaRegNewspaper /> Articles by {profile.full_name}
          </h2>
        </div>

        {!profile.posts || profile.posts.length === 0 ? (
          <div className={styles.noPosts}>
            <FaThLarge className={styles.emptyIcon} />
            <p>No articles published yet.</p>
          </div>
        ) : (
          <div className={styles.postsGrid}>
            {profile.posts.map((post) => (
              <div
                key={post.id}
                className={styles.postCard}
                onClick={() => navigate(`/blog/post/${post.id}`)}
              >
                {post.post_img && (
                  <div className={styles.cardImageFrame}>
                    <img src={post.post_img} alt={post.post_title} />
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Account;
