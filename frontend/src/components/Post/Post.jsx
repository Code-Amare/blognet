import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FaHeart, FaRegHeart, FaArrowRight } from "react-icons/fa";
import { formatDistanceToNow, parseISO } from "date-fns";
import numeral from "numeral";
import UserContext from "../../context/UserContext";
import styles from "./Post.module.css";
import { Link } from "react-router-dom";

const MAX_BODY_LENGTH = 120; // Maximum characters before truncation

const Post = ({ post }) => {
  const { user } = useContext(UserContext);

  // Initialize states with API response values
  const [likeCount, setLikeCount] = useState(post?.like ?? 0);
  const [isLiked, setIsLiked] = useState(Boolean(post?.is_liked_by_me));
  const socketRef = useRef(null);

  // Keep local states synchronized if parent props update
  useEffect(() => {
    setLikeCount(post?.like ?? 0);
    setIsLiked(Boolean(post?.is_liked_by_me));
  }, [post?.like, post?.is_liked_by_me]);

  const formatLikes = (count) => {
    return numeral(count).format(count < 1000 ? "0a" : "0.0a");
  };

  const getReadableTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null; // Return null instead of placeholder URL
    if (avatarPath.includes("http://") || avatarPath.includes("https://")) {
      return avatarPath;
    }
    return `http://127.0.0.1:8000${avatarPath}`;
  };

  // Truncate post body with ellipsis
  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  };

  const avatar = getAvatarUrl(post?.profile?.avatar);
  const readableTime = getReadableTime(post?.timestamp);
  const truncatedBody = truncateText(post?.post_body, MAX_BODY_LENGTH);

  // Extract initial letter for avatar fallback
  const authorDisplayName = post?.profile?.display_name || post?.user || "A";
  const initialLetter = authorDisplayName.charAt(0).toUpperCase();

  const onMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.post_id === post?.id) {
          if (typeof data.like_count === "number") {
            setLikeCount(data.like_count);
          }
          // Update isLiked if WebSocket sends user-specific like state back
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
    [post?.id, user?.username]
  );

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname;
    const socketUrl = `${protocol}://${host}:8000/ws/like/`;

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => console.log(`✅ Connected: Post #${post?.id}`);
    socket.onmessage = onMessage;

    return () => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [onMessage, post?.id]);

  const handleLikePost = (id) => {
    // Optimistic UI update
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          message: {
            post_id: id,
            username: user?.username || "anonymous",
          },
        })
      );
    }
  };

  return (
    <article className={styles.PostContainer}>
      <header className={styles.header}>
        <div className={styles.left}>
          <div className={styles.avatarWrapper}>
            {avatar ? (
              <img
                src={avatar}
                alt={`${authorDisplayName} avatar`}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarFallback}>{initialLetter}</div>
            )}
          </div>
          <div className={styles.authorMeta}>
            <h1 className={styles.authorName}>{authorDisplayName}</h1>
            <span className={styles.timestamp}>{readableTime}</span>
          </div>
        </div>

        <button
          type="button"
          className={`${styles.likeBtn} ${isLiked ? styles.liked : ""}`}
          onClick={() => handleLikePost(post.id)}
          aria-label="Like post"
        >
          {isLiked ? (
            <FaHeart className={styles.heartIcon} />
          ) : (
            <FaRegHeart className={styles.heartIcon} />
          )}
          <span>{formatLikes(likeCount)}</span>
        </button>
      </header>

      <div className={styles.body}>
        <h2 className={styles.title}>{post?.post_title}</h2>
        <p className={styles.description}>{truncatedBody}</p>
      </div>

      <footer className={styles.footer}>
        <Link to={`/blog/post/${post?.id}`} className={styles.readMoreBtn}>
          <span>Read More</span>
          <FaArrowRight className={styles.arrowIcon} />
        </Link>
      </footer>
    </article>
  );
};

export default Post;