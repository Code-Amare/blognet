import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCamera,
  FaTrash,
  FaSave,
  FaUser,
  FaPhone,
  FaCalendar,
  FaVenusMars,
} from "react-icons/fa";
import api from "../../hooks/api";
import { useUser } from "../../Context/UserContext";
import { usePageTitle } from "../../Context/PageTitleContext";
import styles from "./EditAccount.module.css";

const EditAccount = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { updatePageTitle } = usePageTitle();

  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    phone_number: "",
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // ---- Set page title ----
  useEffect(() => {
    updatePageTitle("Edit Profile");
  }, [updatePageTitle]);

  // ---- Fetch user data from /user/me/ ----
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/user/me/");
        const userData = response.data.user; // backend wraps user object
        setProfileData(userData);
        setFormData({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          date_of_birth: userData.date_of_birth || "",
          gender: userData.gender || "",
          phone_number: userData.phone_number || "",
        });
        if (userData.profile_picture) {
          setAvatarPreview(userData.profile_picture); // full URL from Cloudinary
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        setFeedback({
          type: "error",
          message: "Failed to load account settings.",
        });
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

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

  const initialLetter = (
    user?.firstName || // fallback from context (still loading)
    "?"
  )
    .charAt(0)
    .toUpperCase();

  // ---- Submit handler ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });
    setUpdateLoading(true);

    const submitData = new FormData();
    submitData.append("first_name", formData.first_name);
    submitData.append("last_name", formData.last_name);
    submitData.append("date_of_birth", formData.date_of_birth || "");
    submitData.append("gender", formData.gender || "");
    submitData.append("phone_number", formData.phone_number || "");

    if (avatarFile) {
      submitData.append("profile_picture", avatarFile);
    } else if (removeAvatar) {
      submitData.append("remove_profile_pic", "true");
    }

    try {
      await api.patch("/user/profile/update/", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFeedback({
        type: "success",
        message: "Profile updated successfully!",
      });
      // Reload to reflect changes (user context will be refreshed)
      window.location.reload();
    } catch (error) {
      console.error("Update error:", error);
      const errData = error.response?.data;
      setFeedback({
        type: "error",
        message:
          typeof errData?.errors === "string"
            ? errData.errors
            : errData?.detail || "Failed to update profile.",
      });
    } finally {
      setUpdateLoading(false);
    }
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
        <p>Update your personal information and photo</p>
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
                alt="Profile preview"
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

        {/* Fields matching UpdateProfileSerializer */}
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
              placeholder="Your first name"
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
              placeholder="Your last name"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.rowGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <FaCalendar className={styles.fieldIcon} /> Date of Birth
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <FaVenusMars className={styles.fieldIcon} /> Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <FaPhone className={styles.fieldIcon} /> Phone Number
          </label>
          <input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="Enter your phone number"
            className={styles.input}
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
