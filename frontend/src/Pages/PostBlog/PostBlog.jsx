import { useEffect, useState } from "react";
import styles from "./PostBlog.module.css";
import Post from "../../components/Post/Post";
import api from "../../hooks/api"; // ✅ new
import { usePageTitle } from "../../Context/PageTitleContext"; // ✅ new

const PostBlog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { updatePageTitle } = usePageTitle();

  useEffect(() => {
    updatePageTitle("My Posts");
  }, [updatePageTitle]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get("/blog/my-post/");
        const data = response.data;
        // Handle both paginated and plain array responses
        setPosts(data.results || data);
      } catch (err) {
        console.error("Failed to load posts:", err);
        setError("Failed to load your posts.");
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

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
