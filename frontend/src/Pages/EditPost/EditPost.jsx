// pages/EditPost/EditPost.jsx
import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdImage,
  MdDelete,
  MdEdit,
  MdVisibility,
  MdPalette,
  MdCategory,
} from "react-icons/md";
import { useAxios } from "../../hooks/useAxios";
import styles from "./EditPost.module.css";
import defaultImg from "../../assets/defaultImg.png";

const ACCENT_COLORS = [
  "#000000",
  "#FF5252",
  "#2563EB",
  "#059669",
  "#7C3AED",
  "#D97706",
];

const EditPost = ({ categoriesUrl = "/blog/categories/" }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const postImgRef = useRef();

  const [activeTab, setActiveTab] = useState("edit");
  const [categories, setCategories] = useState([]);

  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("#000000");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const [errorMsg, setErrorMsg] = useState("");

  // ---- Fetch categories ----
  const {
    response: categoriesResponse,
    loading: categoriesLoading,
    error: categoriesError,
  } = useAxios({
    method: "GET",
    url: categoriesUrl,
    isProtected: true,
    run: true,
  });

  // ---- Fetch existing post ----
  const {
    response: postData,
    loading: postLoading,
    error: postError,
  } = useAxios({
    method: "GET",
    url: `/blog/edit-post/${postId}/`,
    isProtected: true,
    run: !!postId,
  });

  // ---- Update post (PATCH) ----
  const [updatePayload, setUpdatePayload] = useState(null);
  const {
    response: updateResponse,
    loading: updateLoading,
    error: updateError,
  } = useAxios({
    method: "PATCH",
    url: `/blog/edit-post/${postId}/`,
    data: updatePayload,
    isProtected: true,
    run: updatePayload !== null,
  });

  // ---- Handle categories ----
  useEffect(() => {
    if (categoriesResponse) {
      let fetchedData = categoriesResponse;
      if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        setCategories(fetchedData);
      }
    }
    if (categoriesError) {
      console.error("Error loading categories:", categoriesError);
    }
  }, [categoriesResponse, categoriesError]);

  // ---- Handle post data ----
  useEffect(() => {
    if (postData) {
      setPostTitle(postData.post_title || "");
      setPostBody(postData.post_body || "");
      setColor(postData.post_title_color || "#000000");
      // Set category
      const cat = postData.post_category;
      if (cat) {
        // find the matching category value from the list
        const found = categories.find((c) => getCatValue(c) === cat);
        setCategory(found ? getCatValue(found) : cat);
      }
      // Set existing image
      if (postData.post_img) {
        const imgUrl = getAssetUrl(postData.post_img);
        setExistingImageUrl(imgUrl);
        setPreviewUrl(imgUrl);
      }
    }
  }, [postData, categories]);

  // ---- Handle update response ----
  useEffect(() => {
    if (updateResponse) {
      navigate("/blog/post");
      setUpdatePayload(null);
    }
  }, [updateResponse, navigate]);

  // ---- Handle update error ----
  useEffect(() => {
    if (updateError) {
      console.error("Error updating post:", updateError);
      setErrorMsg("Failed to update post. Please try again.");
      setUpdatePayload(null);
    }
  }, [updateError]);

  // ---- Helper functions ----
  const getAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    let cleanPath = path;
    if (cleanPath.startsWith("/api/")) {
      cleanPath = cleanPath.slice(4);
    }
    const mediaBase = import.meta.env.VITE_MEDIA_URL || "http://127.0.0.1:8001";
    return cleanPath.startsWith("/")
      ? `${mediaBase}${cleanPath}`
      : `${mediaBase}/${cleanPath}`;
  };

  const getCatValue = (item) => {
    if (!item) return "";
    if (typeof item === "object") {
      return String(item.value ?? item.id ?? item.name ?? "");
    }
    return String(item);
  };

  const getCatLabel = (item) => {
    if (!item) return "";
    if (typeof item === "object") {
      return item.label || item.name || item.title || item.value || "";
    }
    return String(item);
  };

  const getSelectedCategoryLabel = () => {
    if (!category) return "Uncategorized";
    const found = categories.find((c) => getCatValue(c) === category);
    return found ? getCatLabel(found) : category;
  };

  // ---- Handle image change ----
  useEffect(() => {
    if (!file) {
      // If no new file, keep the existing image preview
      if (existingImageUrl) {
        setPreviewUrl(existingImageUrl);
      } else {
        setPreviewUrl(null);
      }
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, existingImageUrl]);

  // ---- Event handlers ----
  const handleCategoryClick = (val) => {
    setCategory(String(val));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setFile(null);
    setExistingImageUrl(null);
    setPreviewUrl(null);
    if (postImgRef.current) postImgRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!postTitle.trim()) {
      setErrorMsg("Please provide a title for your post.");
      return;
    }

    setErrorMsg("");

    const formData = new FormData();
    formData.append("post_title", postTitle);
    formData.append("post_body", postBody);
    if (file) {
      formData.append("post_img", file);
    } else if (existingImageUrl === null && postData?.post_img) {
      // If the user removed the image, send a flag to delete it
      formData.append("remove_img", "true");
    }
    formData.append("post_title_color", color);
    formData.append("post_category", category);

    setUpdatePayload(formData);
  };

  // ---- Loading state ----
  if (postLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading post...</p>
      </div>
    );
  }

  if (postError || !postData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Post Not Found</h2>
        <p>Unable to load the post you're trying to edit.</p>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={styles.editorContainer}>
      <header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Edit Article</h1>
        </div>

        <div className={styles.tabGroup}>
          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "edit" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("edit")}
          >
            <MdEdit />
            <span>Write</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "preview" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("preview")}
          >
            <MdVisibility />
            <span>Preview</span>
          </button>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={updateLoading}
          >
            {updateLoading ? "Updating..." : "Update Post"}
          </button>
        </div>
      </header>

      {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

      <main className={styles.workspace}>
        {activeTab === "edit" ? (
          <form className={styles.formCanvas} onSubmit={handleSubmit}>
            <div className={styles.coverUploadSection}>
              <input
                type="file"
                ref={postImgRef}
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className={styles.imagePreviewFrame}>
                  <img src={previewUrl} alt="Cover preview" />
                  <div className={styles.imageOverlay}>
                    <button
                      type="button"
                      className={styles.changeImgBtn}
                      onClick={() => postImgRef.current.click()}
                    >
                      Change Cover
                    </button>
                    <button
                      type="button"
                      className={styles.removeImgBtn}
                      onClick={handleRemoveImage}
                      title="Remove image"
                    >
                      <MdDelete />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.uploadDropzone}
                  onClick={() => postImgRef.current.click()}
                >
                  <MdImage className={styles.uploadIcon} />
                  <span>Add a cover image</span>
                </div>
              )}
            </div>

            <div className={styles.titleWrapper}>
              <input
                type="text"
                placeholder="Article Title..."
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className={styles.titleInput}
                style={{ color: color }}
              />
            </div>

            <div className={styles.metaToolbar}>
              <div className={styles.toolbarField}>
                <label>
                  <MdCategory /> Category
                </label>
                <div className={styles.categoryPills}>
                  {categoriesLoading ? (
                    <span>Loading categories...</span>
                  ) : (
                    categories.map((catItem, idx) => {
                      const catVal = getCatValue(catItem);
                      const catLabel = getCatLabel(catItem);
                      const isSelected = category === catVal;

                      return (
                        <button
                          key={catVal || idx}
                          type="button"
                          className={`${styles.pill} ${
                            isSelected ? styles.activePill : ""
                          }`}
                          style={{
                            backgroundColor: isSelected ? "#2563EB" : "#ffffff",
                            color: isSelected ? "#ffffff" : "#333333",
                            border: isSelected
                              ? "1px solid #2563EB"
                              : "1px solid #ccc",
                            cursor: "pointer",
                            pointerEvents: "auto",
                          }}
                          onClick={() => handleCategoryClick(catVal)}
                        >
                          {catLabel}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={styles.toolbarField}>
                <label>
                  <MdPalette /> Title Color
                </label>
                <div className={styles.colorSwatches}>
                  {ACCENT_COLORS.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      className={`${styles.swatch} ${
                        color === swatch ? styles.activeSwatch : ""
                      }`}
                      style={{ backgroundColor: swatch }}
                      onClick={() => setColor(swatch)}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className={styles.customColorInput}
                    title="Choose custom color"
                  />
                </div>
              </div>
            </div>

            <div className={styles.bodyWrapper}>
              <textarea
                placeholder="Tell your story..."
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                className={styles.bodyTextarea}
              />
            </div>
          </form>
        ) : (
          <article className={styles.previewCanvas}>
            <div className={styles.previewCategory}>
              {getSelectedCategoryLabel()}
            </div>

            <h1 className={styles.previewTitle} style={{ color: color }}>
              {postTitle || "Untitled Article"}
            </h1>

            <div className={styles.previewCover}>
              <img src={previewUrl || defaultImg} alt="Article cover" />
            </div>

            <div className={styles.previewBody}>
              {postBody ? (
                postBody
                  .split("\n")
                  .map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
              ) : (
                <p className={styles.placeholderText}>
                  Your article content will be displayed here...
                </p>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default EditPost;
