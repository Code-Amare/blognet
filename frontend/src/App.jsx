import { Route, Routes, useNavigate, useLocation } from "react-router-dom";

import { useEffect } from "react";

import Home from "./Pages/Home/Home";
import Blog from "./Pages/Blog/Blog";
import Register from "./Pages/Register/Register";
import Login from "./Pages/Login/Login";
import Logout from "./Pages/Logout/Logout";
import ServerDown from "./Pages/ServerDown/ServerDown";

import { useServerStatus } from "./hooks/useServerStatus";
import ForgotPassword from "./Pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./Pages/ResetPassword/ResetPassword";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const isUp = useServerStatus();

  useEffect(() => {
    // Still checking server status
    if (isUp === null) {
      return;
    }

    // Server is alive
    if (isUp === true) {
      return;
    }

    const params = new URLSearchParams(location.search);

    // Already inside server-down page
    // Do not redirect again
    if (location.pathname === "/server-down" && params.has("nextPage")) {
      return;
    }

    const nextPage = location.pathname + location.search;

    navigate(`/server-down?nextPage=${encodeURIComponent(nextPage)}`, {
      replace: true,
    });
  }, [isUp, location, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/server-down" element={<ServerDown />} />

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
