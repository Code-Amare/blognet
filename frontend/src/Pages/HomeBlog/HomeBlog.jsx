import React, { useCallback, useEffect, useRef, useState } from "react";
import Post from "../../components/Post/Post";
import PostBlank from "../../components/PostBlank/PostBlank";
import api from "../../hooks/api";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./HomeBlog.module.css";

const HomeBlog = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const observer = useRef(null);

  const { updatePageTitle } = usePageTitle();

  // ---- Set page title ----
  useEffect(() => {
    updatePageTitle("Home");
  }, [updatePageTitle]);

  // ---- Fetch posts whenever page changes ----
  useEffect(() => {
    let cancelled = false;
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/blog/posts/?page=${page}`);
        if (cancelled) return;
        const data = response.data;
        const fetchedPosts = data.results || data || [];
        const nextUrl = data.next;

        setPosts((prev) => {
          if (page === 1) return fetchedPosts;
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = fetchedPosts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });

        setHasMore(Boolean(nextUrl));
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load posts:", err);
        setError("Failed to load feed. Please check your connection.");
        setHasMore(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPosts();
    return () => {
      cancelled = true;
    };
  }, [page]);

  // ---- Intersection Observer for infinite scroll ----
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            setPage((prev) => prev + 1);
          }
        },
        { threshold: 0.5 },
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  return (
    <main className={styles.HomeBlogContainer}>
      <div className={styles.feedWrapper}>
        {posts.map((post, index) => {
          const isLast = posts.length === index + 1;
          return (
            <div
              key={post.id}
              ref={isLast ? lastPostRef : null}
              className={styles.postCard}
            >
              <Post post={post} />
            </div>
          );
        })}

        {loading && (
          <div className={styles.loadingContainer}>
            <PostBlank />
            <PostBlank />
          </div>
        )}

        {!loading && posts.length === 0 && !error && (
          <div className={styles.emptyState}>
            <h3>No Posts Found</h3>
            <p>Be the first to create and publish a new story!</p>
          </div>
        )}

        {error && <div className={styles.errorState}>{error}</div>}

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
