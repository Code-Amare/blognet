import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import HomeNav from "../../components/HomeNav/HomeNav";
import api from "../../hooks/api";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./Login.module.css";

import FoodVisual from "../../assets/Hamburger.gif";
import EduVisual from "../../assets/Learning.gif";
import TechVisual from "../../assets/Robotarm.gif";
import { useUser } from "../../Context/UserContext";

const STATES = [
  { visualSrc: FoodVisual, color: "#FF5252" },
  { visualSrc: TechVisual, color: "#407BFF" },
  { visualSrc: EduVisual, color: "#22C55E" },
];

const Login = ({ interval = 8000 }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const { updatePageTitle } = usePageTitle();
  const { login } = useUser();

  useEffect(() => {
    STATES.forEach((state) => {
      const img = new Image();
      img.src = state.visualSrc;
    });
    updatePageTitle("Login");
  }, [updatePageTitle]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATES.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  const current = STATES[index];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post(
        "/user/login/",
        { email, password },
        { skipAuthRefresh: true },
      );
      const data = response.data;

      // ----- Unverified user -----
      if (data.verification_required) {
        toast.error(data.error || "Your email is not verified.");
        // Navigate to verify page after a short delay
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 1500);
        return;
      }

      // ----- Two-factor login link sent -----
      if (data.twofa_required) {
        toast.success(
          data.detail || "A login link has been sent to your email.",
        );
        // Optionally clear password field
        setPassword("");
        return;
      }
      navigate("/blog");
    } catch (error) {
      const errData = error.response?.data;
      const msg = errData?.error || errData?.detail || "Invalid credentials.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleSubmitting(true);
      try {
        const response = await api.post(
          "/user/login/google/",
          {
            token: tokenResponse.access_token,
          },
          {
            skipAuthRefresh: true,
          },
        );
        const data = response.data;

        if (data.error) {
          toast.error(data.error);
        } else {
          const user = data?.user;
          if (user) {
            login(user);
          }
          navigate("/blog");
        }
      } catch (error) {
        const errData = error.response?.data;
        const msg = errData?.error || errData?.detail || "Google login failed.";
        toast.error(msg);
      } finally {
        setIsGoogleSubmitting(false);
      }
    },
    onError: () => {
      toast.error("Google login authorization failed.");
    },
  });

  return (
    <div
      className={styles.loginContainer}
      style={{ "--accent-color": current.color }}
    >
      <HomeNav
        currentPage="signIn"
        isHomePage={false}
        bgColor={current.color}
      />

      <main className={styles.mainWrapper}>
        <section className={styles.formSection}>
          <div className={styles.formCard}>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>Sign in to continue to BlogNet</p>

            <button
              type="button"
              className={styles.googleBtn}
              onClick={() => handleGoogleLogin()}
              disabled={isSubmitting || isGoogleSubmitting}
            >
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>
                {isGoogleSubmitting
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </span>
            </button>

            <div className={styles.divider}>
              <span className={styles.dividerLine}></span>
              <span className={styles.dividerText}>or sign in with email</span>
              <span className={styles.dividerLine}></span>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  className={styles.input}
                  type="email"
                  id="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <input
                  className={styles.input}
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className={styles.forgotPassword}>
                <Link to="/forgot-password" className={styles.link}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={
                  !email || !password || isSubmitting || isGoogleSubmitting
                }
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className={styles.footerText}>
              Don't have an account yet?{" "}
              <Link className={styles.link} to="/register">
                Sign Up here
              </Link>
            </p>
          </div>
        </section>

        <section className={styles.visualSection}>
          <div className={styles.visualWrapper}>
            <img
              src={current.visualSrc}
              alt="Category Visual"
              className={styles.visualImg}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
