import React, { useCallback, useEffect, useRef, useState } from "react";
import Post from "../../components/Post/Post";
import PostBlank from "../../components/PostBlank/PostBlank";
import { useAxios } from "../../hooks/useAxios"; // adjust path
import styles from "./HomeBlog.module.css";

const HomeBlog = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef(null);

  // Fetch posts for current page
  const { response, loading, error } = useAxios({
    method: "GET",
    url: `/blog/posts/?page=${page}`,
    isProtected: true, // uses stored token
    run: true,
  });

  // Handle new page data
  useEffect(() => {
    if (!response) return;

    const fetchedPosts = response.results || response || [];
    const nextUrl = response.next;

    setPosts((prev) => {
      if (page === 1) {
        // First page – replace
        return fetchedPosts;
      } else {
        // Subsequent pages – append and deduplicate
        const existingIds = new Set(prev.map((p) => p.id));
        const newUniquePosts = fetchedPosts.filter(
          (p) => !existingIds.has(p.id),
        );
        return [...prev, ...newUniquePosts];
      }
    });

    setHasMore(Boolean(nextUrl));
  }, [response, page]);

  // Handle fetch errors – stop loading more
  useEffect(() => {
    if (error) {
      console.error("Failed to load posts:", error);
      setHasMore(false);
    }
  }, [error]);

  // IntersectionObserver callback
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            setPage((prevPage) => prevPage + 1);
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
        {/* Render posts */}
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

        {/* Loading skeletons */}
        {loading && (
          <div className={styles.loadingContainer}>
            <PostBlank />
            <PostBlank />
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && !error && (
          <div className={styles.emptyState}>
            <h3>No Posts Found</h3>
            <p>Be the first to create and publish a new story!</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className={styles.errorState}>
            Failed to load feed. Please check your connection.
          </div>
        )}

        {/* End of feed */}
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
