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

const PostDetail = ({
  postDetailUrl = "http://127.0.0.1:8000/blog/posts/",
}) => {
  const { id } = useParams();
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

  // 1. Fetch Post Detail
  useEffect(() => {
    const fetchPostDetail = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${postDetailUrl}${id}/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        });
        const data = response.data;
        console.log(data);

        setPost(data);
        setLikeCount(data.like ?? 0);
        setComments(data.comments || []);
      } catch (err) {
        console.error("Error fetching post detail:", err.response);
        setError("Failed to load article. It may have been removed.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPostDetail();
  }, [id, postDetailUrl]);

  // 2. WebSocket for real-time like sync
  const onMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.post_id === Number(id) &&
          typeof data.like_count === "number"
        ) {
          setLikeCount(data.like_count);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname;
    const socketUrl = `${protocol}://${host}:8000/ws/like/`;

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => console.log(`✅ Connected to PostDetail #${id}`);
    socket.onmessage = onMessage;

    return () => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [id, onMessage]);

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

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return "https://via.placeholder.com/150";
    if (avatarPath.includes("http://") || avatarPath.includes("https://")) {
      return avatarPath;
    }
    return `http://127.0.0.1:8000${avatarPath}`;
  };

  // Actions
  const handleLikePost = () => {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          message: {
            post_id: Number(id),
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
        `${postDetailUrl}${id}/comments/`,
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

  const avatar = getAvatarUrl(post?.profile?.avatar);
  const coverImage = post?.post_img ? getAvatarUrl(post.post_img) : null;

  return (
    <article className={styles.detailContainer}>
      {/* Navigation Header */}
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

      {/* Article Title Header */}
      <header className={styles.articleHeader}>
        {post.category && (
          <span className={styles.categoryBadge}>{post.category}</span>
        )}
        <h1
          className={styles.title}
          style={post.post_title_color ? { color: post.post_title_color } : {}}
        >
          {post.post_title}
        </h1>

        <div className={styles.authorBar}>
          <div className={styles.authorMeta}>
            <img src={avatar} alt="Author avatar" className={styles.avatar} />
            <div>
              <h3 className={styles.authorName}>
                {post?.profile?.display_name || post?.user || "Anonymous"}
              </h3>
              <span className={styles.timestamp}>
                {getReadableTime(post.timestamp)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`${styles.likeBtn} ${isLiked ? styles.liked : ""}`}
            onClick={handleLikePost}
          >
            {isLiked ? <FaHeart /> : <FaRegHeart />}
            <span>{formatLikes(likeCount)}</span>
          </button>
        </div>
      </header>

      {/* Cover Image */}
      {coverImage && (
        <div className={styles.coverFrame}>
          <img src={coverImage} alt={post.post_title} />
        </div>
      )}

      {/* Article Body */}
      <section className={styles.articleBody}>
        {post.post_body
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

        {/* New Comment Input */}
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

        {/* Comment List */}
        <div className={styles.commentList}>
          {comments.length === 0 ? (
            <p className={styles.noComments}>
              No comments yet. Be the first to start the conversation!
            </p>
          ) : (
            comments.map((comment, idx) => (
              <div key={comment.id || idx} className={styles.commentItem}>
                <img
                  src={getAvatarUrl(comment.profile?.avatar)}
                  alt="Commenter avatar"
                  className={styles.commentAvatar}
                />
                <div className={styles.commentContent}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentAuthor}>
                      {comment.profile?.display_name ||
                        comment.username ||
                        "Anonymous"}
                    </span>
                    <span className={styles.commentTime}>
                      {getReadableTime(comment.timestamp)}
                    </span>
                  </div>
                  <p className={styles.commentText}>{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </article>
  );
};

export default PostDetail;
