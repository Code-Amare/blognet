import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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
import UserContext from "../../context/UserContext";
import styles from "./PostDetail.module.css";

const PostDetail = ({ postDetailUrl = "http://127.0.0.1:8000/blog/post/" }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Comment state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const socketRef = useRef(null);

  // Helper to format local asset paths safely without placeholder domains
  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const baseUrl = "http://127.0.0.1:8000";
    return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  // 1. Fetch Post Detail & Sync State
  useEffect(() => {
    const fetchPostDetail = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${postDetailUrl}${postId}/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        });
        const data = response.data;

        // Extract nested `post` payload returned by API console response
        const postData = data?.post || data;

        setPost(postData);
        setLikeCount(postData?.like ?? 0);
        setIsLiked(Boolean(postData?.is_liked_by_me));
        setComments(postData?.comments || data?.comments || []);
      } catch (err) {
        console.error("Error fetching post detail:", err?.response || err);
        setError("Failed to load article. It may have been removed.");
      } finally {
        setLoading(false);
      }
    };

    if (postId) fetchPostDetail();
  }, [postId, postDetailUrl]);

  // 2. Real-time WebSocket Like Sync
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

  // Helpers
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

  // Actions
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
      const res = await axios.post(
        `${postDetailUrl}comments/${postId}/`,
        { text: newComment },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        },
      );
      setComments((prev) => [res.data, ...prev]);
      setNewComment("");
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

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

  const avatar = getAssetUrl(post?.profile?.avatar);
  const coverImage = getAssetUrl(post?.post_img);

  // Author Display Name & Initial Letter
  const authorName = post?.profile?.display_name || post?.user || "Anonymous";
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <article className={styles.detailContainer}>
      {/* Navigation Bar */}
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

      {/* Article Header */}
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
              {avatar ? (
                <img
                  src={avatar}
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

      {/* Cover Image */}
      {coverImage && (
        <div className={styles.coverFrame}>
          <img src={coverImage} alt={post?.post_title || "Post image"} />
        </div>
      )}

      {/* Article Body */}
      <section className={styles.articleBody}>
        {post?.post_body
          ?.split("\n")
          .map((paragraph, idx) =>
            paragraph.trim() ? <p key={idx}>{paragraph}</p> : <br key={idx} />,
          )}
      </section>

      <hr className={styles.divider} />

      {/* Comments Section */}
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
              const commenterAvatar = getAssetUrl(comment.profile?.avatar);
              const commenterName =
                comment.profile?.display_name ||
                comment.username ||
                "Anonymous";
              const commenterInitial = commenterName.charAt(0).toUpperCase();

              return (
                <div key={comment.id || idx} className={styles.commentItem}>
                  <div className={styles.commentAvatarWrapper}>
                    {commenterAvatar ? (
                      <img
                        src={commenterAvatar}
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
                        {getReadableTime(comment.timestamp)}
                      </span>
                    </div>
                    <p className={styles.commentText}>{comment.text}</p>
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
