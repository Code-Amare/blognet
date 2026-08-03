import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
import styles from "./EditAccount.module.css";

const EditAccount = ({
  editApiUrl = "http://127.0.0.1:8000/api/profile/edit/",
}) => {
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const baseUrl = "http://127.0.0.1:8000";
    return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
  };

  // Helper to extract first initial
  const initialLetter = (formData.display_name || currentUser?.username || "?")
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    const fetchAccountDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access");
        const res = await axios.get(editApiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        setFormData({
          display_name: data.display_name || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
        });

        if (data.avatar) {
          setAvatarPreview(getAssetUrl(data.avatar));
        }
      } catch (err) {
        console.error(err.response);
        setFeedback({
          type: "error",
          message: "Failed to load account settings.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAccountDetails();
  }, [editApiUrl]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const token = localStorage.getItem("access");
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

      const res = await axios.patch(editApiUrl, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      window.location.reload();

      setFeedback({
        type: "success",
        message: "Account updated successfully!",
      });

      if (setUser && res.data?.profile) {
        setUser((prev) => ({ ...prev, ...res.data.profile }));
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <button type="submit" disabled={saving} className={styles.saveBtn}>
            <FaSave /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAccount;
