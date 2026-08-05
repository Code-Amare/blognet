import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import numeral from "numeral";
import {
  FaHeart,
  FaRegHeart,
  FaArrowLeft,
  FaShareAlt,
  FaBookmark,
  FaRegBookmark,
  FaComment,
} from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import api from "../../hooks/api";
import { useUser } from "../../Context/UserContext";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./PostDetail.module.css";

const PostDetail = ({
  postDetailUrl = "/blog/post/",
  commentsUrl = "/blog/post/comments/",
}) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { updatePageTitle } = usePageTitle();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const socketRef = useRef(null);

  // ---- Set page title ----
  useEffect(() => {
    if (post?.post_title) {
      updatePageTitle(post.post_title);
    } else {
      updatePageTitle("Post Detail");
    }
  }, [post, updatePageTitle]);

  // ---- Fetch post and comments ----
  useEffect(() => {
    if (!postId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [postRes, commentsRes] = await Promise.all([
          api.get(`${postDetailUrl}${postId}/`),
          api.get(`${commentsUrl}${postId}/`),
        ]);
        const postData = postRes.data?.post || postRes.data;
        setPost(postData);
        setLikeCount(postData?.like ?? 0);
        setIsLiked(Boolean(postData?.is_liked_by_me));
        setComments(extractCommentsArray(commentsRes.data));
      } catch (err) {
        console.error("Failed to load article:", err);
        setError("Failed to load article. It may have been removed.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [postId, postDetailUrl, commentsUrl]);

  // ---- WebSocket for likes ----
  const onMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.post_id === Number(postId)) {
          if (typeof data.like_count === "number") {
            setLikeCount(data.like_count);
          }
          if (
            data.username === user?.username &&
            typeof data.is_liked_by_me === "boolean"
          ) {
            setIsLiked(data.is_liked_by_me);
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    },
    [postId, user?.username],
  );

  useEffect(() => {
    if (!postId) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const socketUrl = `${protocol}://${host}/ws/like/`;
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    socket.onopen = () => console.log(`Connected to PostDetail #${postId}`);
    socket.onmessage = onMessage;
    return () => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [postId, onMessage]);

  // ---- Helpers ----
  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const mediaBase = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8001";
    return path.startsWith("/")
      ? `${mediaBase}${path}`
      : `${mediaBase}/${path}`;
  };

  const extractCommentsArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.comments)) return data.comments;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const formatLikes = (count) =>
    numeral(count).format(count < 1000 ? "0a" : "0.0a");

  const getReadableTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
    } catch {
      return "";
    }
  };

  // Helper to get display name from a user object (nested)
  const getUserDisplayName = (userObj) => {
    if (!userObj) return "Anonymous";
    return (
      userObj.full_name ||
      [userObj.first_name, userObj.last_name].filter(Boolean).join(" ") ||
      userObj.username ||
      "Anonymous"
    );
  };

  // Helper to get profile picture from a user object
  const getUserAvatar = (userObj) => {
    if (!userObj) return null;
    return userObj.profile_picture || userObj.avatar || null;
  };

  // ---- Actions ----
  const handleLikePost = () => {
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          message: {
            post_id: Number(postId),
            username: user?.username || "anonymous",
          },
        }),
      );
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await api.post(`${commentsUrl}${postId}/`, {
        comment: newComment,
        text: newComment,
        post: Number(postId),
      });
      setComments((prev) => [response.data, ...prev]);
      setNewComment("");
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading article...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.errorContainer}>
        <h2>Article Not Found</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <FaArrowLeft /> Go Back
        </button>
      </div>
    );
  }

  // ---- Extract author info using the new nested user structure ----
  const authorUser = post?.user; // nested user object from UserSerializer
  const authorName = getUserDisplayName(authorUser);
  const authorAvatar = getUserAvatar(authorUser);
  const authorInitial = authorName.charAt(0).toUpperCase();

  // Check if current user is the author (compare IDs)
  const isAuthor = user?.id === authorUser?.id;

  const coverImage = getAssetUrl(post?.post_img);

  return (
    <article className={styles.detailContainer}>
      <nav className={styles.navHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
        <div className={styles.headerActions}>
          {isAuthor && (
            <button
              type="button"
              className={styles.iconActionBtn}
              onClick={() => navigate(`/blog/edit-post/${postId}`)}
              title="Edit Post"
            >
              <MdEdit />
            </button>
          )}
          <button
            type="button"
            className={styles.iconActionBtn}
            onClick={() => setIsBookmarked(!isBookmarked)}
            title="Bookmark"
          >
            {isBookmarked ? (
              <FaBookmark className={styles.bookmarked} />
            ) : (
              <FaRegBookmark />
            )}
          </button>
          <button
            type="button"
            className={styles.iconActionBtn}
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            title="Copy Link"
          >
            <FaShareAlt />
          </button>
        </div>
      </nav>

      <header className={styles.articleHeader}>
        {post?.post_category && (
          <span className={styles.categoryBadge}>{post.post_category}</span>
        )}
        <h1
          className={styles.title}
          style={post?.post_title_color ? { color: post.post_title_color } : {}}
        >
          {post?.post_title}
        </h1>
        <div className={styles.authorBar}>
          <div className={styles.authorMeta}>
            <div className={styles.authorAvatarWrapper}>
              {authorAvatar ? (
                <img
                  src={getAssetUrl(authorAvatar)}
                  alt={`${authorName} avatar`}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>{authorInitial}</div>
              )}
            </div>
            <div>
              <h3 className={styles.authorName}>{authorName}</h3>
              <span className={styles.timestamp}>
                {getReadableTime(post?.timestamp)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`${styles.likeBtn} ${isLiked ? styles.liked : ""}`}
            onClick={handleLikePost}
            aria-label="Like post"
          >
            {isLiked ? <FaHeart /> : <FaRegHeart />}
            <span>{formatLikes(likeCount)}</span>
          </button>
        </div>
      </header>

      {coverImage && (
        <div className={styles.coverFrame}>
          <img src={coverImage} alt={post?.post_title || "Post image"} />
        </div>
      )}

      <section className={styles.articleBody}>
        {post?.post_body
          ?.split("\n")
          .map((paragraph, idx) =>
            paragraph.trim() ? <p key={idx}>{paragraph}</p> : <br key={idx} />,
          )}
      </section>

      <hr className={styles.divider} />

      <section className={styles.commentsSection}>
        <h2>
          <FaComment /> Comments ({comments.length})
        </h2>
        <form className={styles.commentForm} onSubmit={handleAddComment}>
          <textarea
            placeholder="Share your thoughts..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <button
            type="submit"
            disabled={isSubmittingComment || !newComment.trim()}
            className={styles.submitCommentBtn}
          >
            {isSubmittingComment ? "Posting..." : "Post Comment"}
          </button>
        </form>
        <div className={styles.commentList}>
          {comments.length === 0 ? (
            <p className={styles.noComments}>
              No comments yet. Be the first to start the conversation!
            </p>
          ) : (
            comments.map((comment, idx) => {
              // Extract commenter info – assume comment.user is the nested user object
              const commenterUser = comment?.user || comment?.commenter;
              const commenterName = getUserDisplayName(commenterUser);
              const commenterAvatar = getUserAvatar(commenterUser);
              const commenterInitial = commenterName.charAt(0).toUpperCase();

              return (
                <div key={comment?.id || idx} className={styles.commentItem}>
                  <div className={styles.commentAvatarWrapper}>
                    {commenterAvatar ? (
                      <img
                        src={getAssetUrl(commenterAvatar)}
                        alt={`${commenterName} avatar`}
                        className={styles.commentAvatar}
                      />
                    ) : (
                      <div className={styles.commentAvatarFallback}>
                        {commenterInitial}
                      </div>
                    )}
                  </div>
                  <div className={styles.commentContent}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentAuthor}>
                        {commenterName}
                      </span>
                      <span className={styles.commentTime}>
                        {getReadableTime(
                          comment?.timestamp || comment?.created_at,
                        )}
                      </span>
                    </div>
                    <p className={styles.commentText}>{comment?.comment}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </article>
  );
};

export default PostDetail;
