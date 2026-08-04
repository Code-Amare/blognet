import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
import UserContext from "../../context/UserContext";
import { useAxios } from "../../hooks/useAxios"; // adjust import
import styles from "./PostDetail.module.css";

// Use API_URL from env via useAxios; no need for base constant
const PostDetail = ({
  postDetailUrl = "/blog/post/", // relative – hook prepends base
  commentsUrl = "/blog/post/comments/", // relative
}) => {
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

  // ---- 1. Fetch Post Detail ----
  const {
    response: postResponse,
    loading: postLoading,
    error: postError,
  } = useAxios({
    method: "GET",
    url: `${postDetailUrl}${postId}/`,
    isProtected: true,
    run: !!postId,
  });

  // ---- 2. Fetch Comments ----
  const {
    response: commentsResponse,
    loading: commentsLoading,
    error: commentsError,
  } = useAxios({
    method: "GET",
    url: `${commentsUrl}${postId}/`,
    isProtected: true,
    run: !!postId,
  });

  // ---- 3. Submit Comment ----
  const [commentPayload, setCommentPayload] = useState(null);
  const {
    response: commentResponse,
    loading: commentSubmitting,
    error: commentError,
  } = useAxios({
    method: "POST",
    url: `${commentsUrl}${postId}/`,
    data: commentPayload,
    isProtected: true,
    run: commentPayload !== null,
  });

  // ---- Handle post response ----
  useEffect(() => {
    if (postResponse) {
      const data = postResponse;
      const postData = data?.post || data;
      setPost(postData);
      setLikeCount(postData?.like ?? 0);
      setIsLiked(Boolean(postData?.is_liked_by_me));
    }
  }, [postResponse]);

  // ---- Handle post error ----
  useEffect(() => {
    if (postError) {
      console.error("Error loading article:", postError);
      setError("Failed to load article. It may have been removed.");
    }
  }, [postError]);

  // ---- Handle comments response ----
  useEffect(() => {
    if (commentsResponse) {
      const parsed = extractCommentsArray(commentsResponse);
      setComments(parsed);
    }
  }, [commentsResponse]);

  // ---- Handle comments error ----
  useEffect(() => {
    if (commentsError) {
      console.error("Error loading comments:", commentsError);
      // Do not set overall error; just log
    }
  }, [commentsError]);

  // ---- Handle comment submission response ----
  useEffect(() => {
    if (commentResponse) {
      // Append new comment to the list
      setComments((prev) => [commentResponse, ...prev]);
      setNewComment("");
      setCommentPayload(null);
      setIsSubmittingComment(false);
    }
  }, [commentResponse]);

  // ---- Handle comment submission error ----
  useEffect(() => {
    if (commentError) {
      console.error("Error submitting comment:", commentError);
      setCommentPayload(null);
      setIsSubmittingComment(false);
    }
  }, [commentError]);

  // ---- Combine loading state ----
  useEffect(() => {
    // Initial loading is done when both post and comments have finished (or errored)
    if (!postId) return;
    // If postLoading or commentsLoading are true, we're still loading
    // But we also want to handle the case where one fails immediately.
    // We'll set loading false when both have resolved (or errored)
    // Using a simple condition: if postResponse or postError set, and commentsResponse or commentsError set.
    // But we can also use the loading flags directly.
    // For simplicity, we set loading false when postLoading and commentsLoading are both false.
    if (!postLoading && !commentsLoading) {
      setLoading(false);
    }
  }, [postLoading, commentsLoading, postId]);

  // ---- WebSocket like sync (unchanged) ----
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

  const getAssetUrl = (path) => {
    console.log(path);
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    // Use the same base as the hook (or fallback)
    const base = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8000";
    const newPath = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;

    return newPath;
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

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    // Prepare payload – same shape as original
    setCommentPayload({
      comment: newComment,
      text: newComment,
      post: Number(postId),
    });
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

  const avatar = getAssetUrl(post?.profile?.avatar);
  const coverImage = getAssetUrl(post?.post_img);
  const authorName = post?.profile?.display_name || post?.user || "Anonymous";
  const authorInitial = authorName.charAt(0).toUpperCase();

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
            disabled={
              isSubmittingComment || commentSubmitting || !newComment.trim()
            }
            className={styles.submitCommentBtn}
          >
            {isSubmittingComment || commentSubmitting
              ? "Posting..."
              : "Post Comment"}
          </button>
        </form>
        <div className={styles.commentList}>
          {comments.length === 0 ? (
            <p className={styles.noComments}>
              No comments yet. Be the first to start the conversation!
            </p>
          ) : (
            comments.map((comment, idx) => {
              const commenterAvatar = getAssetUrl(comment?.commenter?.avatar);
              const commenterName =
                comment?.commenter?.display_name || "Anonymous";
              const commenterInitial = commenterName.charAt(0).toUpperCase();
              return (
                <div key={comment?.id || idx} className={styles.commentItem}>
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
