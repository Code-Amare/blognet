import { Routes, Route } from "react-router-dom";
import HomeBlog from "../HomeBlog/HomeBlog";
import PostBlog from "../PostBlog/PostBlog";
import Account from "../Account/Account";
import EditAccount from "../EditAccount/EditAccount";
import AddPost from "../AddPost/AddPost";
import PostDetail from "../PostDetail/PostDetail";
import PostEdit from "../PostEdit/PostEdit";
import BlogLayout from "../../components/BlogLayout/BlogLayout";
import EditPost from "../EditPost/EditPost";

const Blog = () => {
  return (
    <Routes>
      <Route path="" element={<BlogLayout />}>
        <Route path="" element={<HomeBlog />} />
        <Route path="add-post/" element={<AddPost />} />
        <Route path="edit-post/:postId" element={<EditPost />} />
        <Route path="post/:postId/" element={<PostDetail />} />
        <Route path="post/" element={<PostBlog />} />
        <Route path="post/edit/:postId/" element={<PostEdit />} />
        <Route path="account/" element={<Account />} />
        <Route path="account/edit/" element={<EditAccount />} />
      </Route>
    </Routes>
  );
};

export default Blog;
