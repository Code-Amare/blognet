import styles from "./PostBlog.module.css";
import Post from "../../components/Post/Post";
import { useAxios } from "../../hooks/useAxios";
import { useEffect, useState } from "react";

const PostBlog = () => {
  const [posts, setPosts] = useState([]);

  const { response, error, loading } = useAxios({
    method: "GET",
    url: "/blog/my-post/", // relative – hook prepends base
    isProtected: true,
    run: true,
  });

  useEffect(() => {
    if (response) {
      // If your API returns paginated results, use response.results
      // If it returns an array directly, fallback to response
      setPosts(response.results || response);
    }
  }, [response]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error)
    return <div className={styles.error}>Failed to load your posts.</div>;

  return (
    <div className={styles.PostBlogContainer}>
      {posts.length > 0 ? (
        posts.map((p) => <Post key={p.id} post={p} />)
      ) : (
        <p>No Post Yet.</p>
      )}
    </div>
  );
};

export default PostBlog;
