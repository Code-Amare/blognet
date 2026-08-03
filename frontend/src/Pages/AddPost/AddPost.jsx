import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  MdImage,
  MdDelete,
  MdEdit,
  MdVisibility,
  MdPalette,
  MdCategory,
} from "react-icons/md";
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
  addPostUrl = "http://127.0.0.1:8000/blog/add-post/",
  categoriesUrl = "http://127.0.0.1:8000/blog/categories/",
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Helpers to safely extract value and label
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

  // 1. Single Fetch on Mount (Prevents re-fetch loops if parent passes empty array reference)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let fetchedData = initialCategories;

        if (!fetchedData || fetchedData.length === 0) {
          const res = await axios.get(categoriesUrl, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access")}`,
            },
          });
          fetchedData = res.data || [];
        }

        if (Array.isArray(fetchedData) && fetchedData.length > 0) {
          setCategories(fetchedData);
          const initialVal = getCatValue(fetchedData[0]);
          setCategory(initialVal);
          console.log("Categories Loaded:", fetchedData);
          console.log("Initial Category Set:", initialVal);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };

    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE on mount

  // 2. Log state changes to confirm React state updates
  useEffect(() => {
    console.log("👉 Current Selected Category State:", category);
  }, [category]);

  // Object URL preview lifecycle
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Handle Category Click with console debug
  const handleCategoryClick = (val) => {
    console.log("🖱️ Category Clicked:", val);
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
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("post_title", postTitle);
    formData.append("post_body", postBody);
    if (file) formData.append("post_img", file);
    formData.append("post_title_color", color);
    formData.append("post_category", category);

    try {
      await axios.post(addPostUrl, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access")}`,
          "Content-Type": "multipart/form-data",
        },
      });
      navigate("/blog/post");
    } catch (err) {
      console.error("Error creating post:", err);
      setErrorMsg("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedCategoryLabel = () => {
    if (!category) return "Uncategorized";
    const found = categories.find((c) => getCatValue(c) === category);
    return found ? getCatLabel(found) : category;
  };

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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish Post"}
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
                  {categories.map((catItem, idx) => {
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
                        // Fallback inline style test to bypass CSS class issues:
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
                  })}
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
