import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCamera,
  FaTrash,
  FaSave,
  FaUser,
  FaEnvelope,
  FaIdCard,
} from "react-icons/fa";
import UserContext from "../../context/UserContext";
import { useAxios } from "../../hooks/useAxios"; // adjust import
import styles from "./EditAccount.module.css";

// URL is now relative – the hook prepends the base from VITE_API_URL
const EditAccount = ({ editApiUrl = "/profile/edit/" }) => {
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useContext(UserContext);

  const [formData, setFormData] = useState({
    display_name: "",
    first_name: "",
    last_name: "",
    email: "",
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // ---- 1. Fetch profile data ----
  const {
    response: profileData,
    loading: profileLoading,
    error: profileError,
  } = useAxios({
    method: "GET",
    url: editApiUrl,
    isProtected: true,
    run: true,
  });

  // ---- 2. Update profile (PATCH) ----
  const [updatePayload, setUpdatePayload] = useState(null);
  const {
    response: updateResponse,
    loading: updateLoading,
    error: updateError,
  } = useAxios({
    method: "PATCH",
    url: editApiUrl,
    data: updatePayload,
    isProtected: true,
    run: updatePayload !== null,
  });

  // ---- Handle fetched profile data ----
  useEffect(() => {
    if (profileData) {
      setFormData({
        display_name: profileData.display_name || "",
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        email: profileData.email || "",
      });
      if (profileData.avatar) {
        setAvatarPreview(getAssetUrl(profileData.avatar));
      }
    }
  }, [profileData]);

  // ---- Handle fetch errors ----
  useEffect(() => {
    if (profileError) {
      console.error("Profile fetch error:", profileError);
      setFeedback({
        type: "error",
        message: "Failed to load account settings.",
      });
    }
  }, [profileError]);

  // ---- Handle update response ----
  useEffect(() => {
    if (updateResponse) {
      setFeedback({
        type: "success",
        message: "Account updated successfully!",
      });
      // Update context if available
      if (setUser && updateResponse?.profile) {
        setUser((prev) => ({ ...prev, ...updateResponse.profile }));
      }
      // Clear the payload to prevent re-fetch
      setUpdatePayload(null);
      // Optionally reload or navigate
      window.location.reload(); // keep original behaviour
    }
  }, [updateResponse, setUser]);

  // ---- Handle update errors ----
  useEffect(() => {
    if (updateError) {
      console.error("Update error:", updateError);
      setFeedback({
        type: "error",
        message:
          updateError.response?.data?.message || "Failed to update profile.",
      });
      setUpdatePayload(null);
    }
  }, [updateError]);

  // ---- Helper: build asset URL ----
  const getAssetUrl = (path) => {
    console.log(path);
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    // Use the same base as the hook (or fallback)
    const base = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8000";
    const newPath = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
    console.log(newPath);

    return newPath;
  };

  // ---- Form handlers ----
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setRemoveAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  const initialLetter = (formData.display_name || currentUser?.username || "?")
    .charAt(0)
    .toUpperCase();

  // ---- Submit handler ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });

    const submitData = new FormData();
    submitData.append("display_name", formData.display_name);
    submitData.append("first_name", formData.first_name);
    submitData.append("last_name", formData.last_name);
    submitData.append("email", formData.email);

    if (avatarFile) {
      submitData.append("avatar", avatarFile);
    } else if (removeAvatar) {
      submitData.append("remove_avatar", "true");
    }

    // Trigger the PATCH request
    setUpdatePayload(submitData);
  };

  // ---- Render ----
  if (profileLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.detailContainer}>
      <nav className={styles.navHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </nav>

      <div className={styles.formHeader}>
        <h1>Edit Profile</h1>
        <p>Update your photo and account information</p>
      </div>

      {feedback.message && (
        <div
          className={`${styles.alert} ${
            feedback.type === "success"
              ? styles.alertSuccess
              : styles.alertError
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.editForm}>
        {/* Avatar Section */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            {avatarPreview && !removeAvatar ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarFallback}>{initialLetter}</div>
            )}

            <label htmlFor="avatarInput" className={styles.uploadBadge}>
              <FaCamera />
              <input
                id="avatarInput"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className={styles.fileInput}
              />
            </label>
          </div>

          <div className={styles.avatarActions}>
            <label htmlFor="avatarInput" className={styles.changeBtn}>
              Change Photo
            </label>
            {avatarPreview && !removeAvatar && (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={handleRemoveAvatar}
              >
                <FaTrash /> Remove
              </button>
            )}
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <FaIdCard className={styles.fieldIcon} /> Display Name
          </label>
          <input
            type="text"
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            placeholder="How you appear on posts"
            className={styles.input}
            required
          />
        </div>

        <div className={styles.rowGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <FaUser className={styles.fieldIcon} /> First Name
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First name"
              className={styles.input}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <FaUser className={styles.fieldIcon} /> Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last name"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <FaEnvelope className={styles.fieldIcon} /> Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateLoading}
            className={styles.saveBtn}
          >
            <FaSave /> {updateLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAccount;
