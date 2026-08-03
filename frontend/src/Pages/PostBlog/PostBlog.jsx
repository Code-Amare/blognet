import styles from "./PostBlog.module.css";
import Post from "../../components/Post/Post";
import { useAxios } from "../../hooks/useAxios";
import { useEffect, useState } from "react";

const PostBlog = () => {
  const [posts, setPosts] = useState([]);
  const config = {
    method: "get",
    isProtected: true,
    url: "http://127.0.0.1:8000/blog/my-post/",
  };
  const { response, error, loading } = useAxios(config);
  useEffect(() => {
    if (response) {
      setPosts(response.results);
      console.log(response);
    }
  }, [response]);
  if (loading) return <h1>Loading...</h1>;
  if (error) return console.log(error);
  console.log(response);
  return (
    <div className={styles.PostBlogContainer}>
      {posts.length > 0
        ? posts.map((p) => {
            return <Post key={p.id} post={p} />;
          })
        : "No Post Yet."}
    </div>
  );
};

export default PostBlog;
