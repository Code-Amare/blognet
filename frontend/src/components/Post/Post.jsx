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
import { Link } from "react-router-dom";

import UserContext from "../../context/UserContext";
import styles from "./Post.module.css";

const MAX_BODY_LENGTH = 120;

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";
const WS_URL = import.meta.env.VITE_WS_URL;

const Post = ({ post }) => {
  const { user } = useContext(UserContext);

  const [likeCount, setLikeCount] = useState(post?.like ?? 0);
  const [isLiked, setIsLiked] = useState(Boolean(post?.is_liked_by_me));

  const socketRef = useRef(null);

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
      return formatDistanceToNow(parseISO(timestamp), {
        addSuffix: true,
      });
    } catch {
      return "";
    }
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;

    // Cloudinary or any absolute URL
    if (/^https?:\/\//.test(avatarPath)) {
      return avatarPath;
    }

    // Relative URL from Django
    return `${MEDIA_URL}${avatarPath}`;
  };

  const truncateText = (text, maxLength) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
  };

  const avatar = getAvatarUrl(post?.profile?.avatar);
  const readableTime = getReadableTime(post?.timestamp);
  const truncatedBody = truncateText(post?.post_body, MAX_BODY_LENGTH);

  const authorDisplayName =
    post?.profile?.display_name || post?.user || "Anonymous";

  const initialLetter = authorDisplayName.charAt(0).toUpperCase();

  const onMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.post_id !== post?.id) return;

        if (typeof data.like_count === "number") {
          setLikeCount(data.like_count);
        }

        if (
          data.username === user?.username &&
          typeof data.is_liked_by_me === "boolean"
        ) {
          setIsLiked(data.is_liked_by_me);
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    },
    [post?.id, user?.username],
  );

  useEffect(() => {
    // Skip websocket if URL isn't configured
    if (!WS_URL) return;

    const socket = new WebSocket(`${WS_URL}/like/`);

    socketRef.current = socket;

    socket.onopen = () => {
      console.log(`Connected to like socket for post ${post?.id}`);
    };

    socket.onmessage = onMessage;

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("Like socket closed.");
    };

    return () => {
      socket.close();
    };
  }, [onMessage, post?.id]);

  const handleLikePost = (id) => {
    const nextIsLiked = !isLiked;

    // Optimistic update
    setIsLiked(nextIsLiked);
    setLikeCount((prev) => (nextIsLiked ? prev + 1 : Math.max(prev - 1, 0)));

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          message: {
            post_id: id,
            username: user?.username || "anonymous",
          },
        }),
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
