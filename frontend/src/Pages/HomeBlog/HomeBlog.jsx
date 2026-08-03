import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Post from "../../components/Post/Post";
import PostBlank from "../../components/PostBlank/PostBlank";
import styles from "./HomeBlog.module.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const HomeBlog = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const observer = useRef(null);

  // IntersectionObserver callback attached to the last element sentinel
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setPage((prevPage) => prevPage + 1);
          }
        },
        { threshold: 0.5 },
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  // Fetch paginated posts from backend
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("access");
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    axios
      .get(`${API_BASE_URL}/blog/posts/?page=${page}`, {
        headers: authHeader,
      })
      .then((res) => {
        if (cancel) return;

        const fetchedPosts = res.data?.results || res.data || [];
        const nextUrl = res.data?.next;

        setPosts((prev) => {
          // De-duplicate posts by post ID
          const existingIds = new Set(prev.map((p) => p.id));
          const newUniquePosts = fetchedPosts.filter(
            (p) => !existingIds.has(p.id),
          );
          return [...prev, ...newUniquePosts];
        });

        // Determine if there are more pages
        setHasMore(Boolean(nextUrl));
      })
      .catch((err) => {
        if (cancel) return;
        console.error("Failed to load posts:", err);
        setError("Failed to load feed. Please check your connection.");
        setHasMore(false);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [page]);

  return (
    <main className={styles.HomeBlogContainer}>
      <div className={styles.feedWrapper}>
        {/* Render List of Posts */}
        {posts.map((post, index) => {
          if (posts.length === index + 1) {
            return (
              <div ref={lastPostRef} key={post.id} className={styles.postCard}>
                <Post post={post} />
              </div>
            );
          }
          return (
            <div key={post.id} className={styles.postCard}>
              <Post post={post} />
            </div>
          );
        })}

        {/* Loading Skeletons */}
        {loading && (
          <div className={styles.loadingContainer}>
            <PostBlank />
            <PostBlank />
          </div>
        )}

        {/* No Posts Empty State */}
        {!loading && posts.length === 0 && !error && (
          <div className={styles.emptyState}>
            <h3>No Posts Found</h3>
            <p>Be the first to create and publish a new story!</p>
          </div>
        )}

        {/* Error State */}
        {error && <div className={styles.errorState}>{error}</div>}

        {/* End of Feed Message */}
        {!hasMore && posts.length > 0 && (
          <div className={styles.endOfFeed}>
            <span>You've reached the end of the feed.</span>
          </div>
        )}
      </div>
    </main>
  );
};

export default HomeBlog;
