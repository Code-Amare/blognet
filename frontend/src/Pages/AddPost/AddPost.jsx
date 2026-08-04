import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdImage,
  MdDelete,
  MdEdit,
  MdVisibility,
  MdPalette,
  MdCategory,
} from "react-icons/md";
import { useAxios } from "../../hooks/useAxios"; // adjust import
import styles from "./AddPost.module.css";
import defaultImg from "../../assets/defaultImg.png";

const ACCENT_COLORS = [
  "#000000",
  "#FF5252",
  "#2563EB",
  "#059669",
  "#7C3AED",
  "#D97706",
];

const AddPost = ({
  addPostUrl = "/blog/add-post/", // relative – hook prepends base
  categoriesUrl = "/blog/categories/", // relative
  initialCategories = [],
}) => {
  const postImgRef = useRef();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("edit");
  const [categories, setCategories] = useState(initialCategories);

  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("#000000");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [errorMsg, setErrorMsg] = useState("");

  // ---- 1. Fetch categories ----
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

  // ---- 2. Submit post ----
  const [submitPayload, setSubmitPayload] = useState(null);
  const {
    response: submitResponse,
    loading: submitLoading,
    error: submitError,
  } = useAxios({
    method: "POST",
    url: addPostUrl,
    data: submitPayload,
    isProtected: true,
    run: submitPayload !== null,
  });

  // ---- Handle categories response ----
  useEffect(() => {
    if (categoriesResponse) {
      let fetchedData = categoriesResponse;
      if (Array.isArray(fetchedData) && fetchedData.length > 0) {
        setCategories(fetchedData);
        const initialVal = getCatValue(fetchedData[0]);
        setCategory(initialVal);
      }
    }
    if (categoriesError) {
      console.error("Error loading categories:", categoriesError);
    }
  }, [categoriesResponse, categoriesError]);

  // ---- Handle submit response ----
  useEffect(() => {
    if (submitResponse) {
      navigate("/blog/post");
      setSubmitPayload(null);
    }
  }, [submitResponse, navigate]);

  // ---- Handle submit error ----
  useEffect(() => {
    if (submitError) {
      console.error("Error creating post:", submitError);
      setErrorMsg("Failed to create post. Please try again.");
      setSubmitPayload(null);
    }
  }, [submitError]);

  // ---- Helpers for category value/label ----
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

  // ---- Object URL preview lifecycle ----
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

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
    if (postImgRef.current) postImgRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postTitle.trim()) {
      setErrorMsg("Please provide a title for your post.");
      return;
    }

    setErrorMsg("");

    const formData = new FormData();
    formData.append("post_title", postTitle);
    formData.append("post_body", postBody);
    if (file) formData.append("post_img", file);
    formData.append("post_title_color", color);
    formData.append("post_category", category);

    // Trigger the POST request
    setSubmitPayload(formData);
  };

  // ---- Render ----
  return (
    <div className={styles.editorContainer}>
      <header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Create New Article</h1>
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
            disabled={submitLoading}
          >
            {submitLoading ? "Publishing..." : "Publish Post"}
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
              ></textarea>
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

export default AddPost;
