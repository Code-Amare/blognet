import { Route, Routes, useNavigate, useLocation } from "react-router-dom";

import { useEffect } from "react";

import Home from "./Pages/Home/Home";
import Blog from "./Pages/Blog/Blog";
import Register from "./Pages/Register/Register";
import Login from "./Pages/Login/Login";
import Logout from "./Pages/Logout/Logout";

import ForgotPassword from "./Pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword/ResetPassword";

function App() {


  return (
    <Routes>
      <Route path="/" element={<Home />} />


      <Route path="/register" element={<Register />} />

      <Route path="/login" element={<Login />} />

      <Route path="/logout" element={<Logout />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/password/reset/:code" element={<ResetPassword />} />

      <Route path="/blog/*" element={<Blog />} />
    </Routes>
  );
}

export default App;
