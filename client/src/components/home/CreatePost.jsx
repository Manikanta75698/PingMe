import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  Send,
  X,
} from "lucide-react";

import { createPost } from "../../services/postService";

import DefaultAvatar from "../../assets/default-avatar.png";

import styles from "./CreatePost.module.css";

const MAX_CAPTION_LENGTH = 500;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const CreatePost = ({ onPostCreated }) => {
  const [caption, setCaption] =
    useState("");

  const [image, setImage] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [expanded, setExpanded] =
    useState(false);

  const [error, setError] =
    useState("");

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const currentUser = (() => {
    try {
      const storedUser =
        localStorage.getItem("user");

      return storedUser
        ? JSON.parse(storedUser)
        : null;
    } catch {
      return null;
    }
  })();

  const hasContent =
    caption.trim().length > 0 ||
    Boolean(image);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleExpand = () => {
    setExpanded(true);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleImageChange = (e) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setError("");

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "Please select a valid image."
      );

      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError(
        "Image must be smaller than 10 MB."
      );

      e.target.value = "";
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const nextPreview =
      URL.createObjectURL(file);

    setImage(file);
    setPreview(nextPreview);
    setExpanded(true);
  };

  const handleRemoveImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setImage(null);
    setPreview("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    if (loading) return;

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setCaption("");
    setImage(null);
    setPreview("");
    setError("");
    setExpanded(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (loading) return;

    if (!image) {
      setError(
        "Please select an image to create a post."
      );

      setExpanded(true);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData =
        new FormData();

      formData.append(
        "caption",
        caption.trim()
      );

      formData.append(
        "postImage",
        image
      );

      await createPost(formData);

      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setCaption("");
      setImage(null);
      setPreview("");
      setExpanded(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (onPostCreated) {
        await onPostCreated();
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to create post. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className={styles.composer}
      aria-label="Create post"
    >
      <form onSubmit={handleSubmit}>
        {/* TOP ROW */}
        <div className={styles.topRow}>
          <img
            src={
              currentUser?.profilePic ||
              DefaultAvatar
            }
            alt={
              currentUser?.name ||
              "Your profile"
            }
            className={styles.avatar}
            onError={(e) => {
              e.currentTarget.onerror =
                null;

              e.currentTarget.src =
                DefaultAvatar;
            }}
          />

          <button
            type="button"
            className={styles.promptButton}
            onClick={handleExpand}
            aria-expanded={expanded}
          >
            <span>
              What's on your mind
              {currentUser?.name
                ? `, ${
                    currentUser.name
                      .trim()
                      .split(/\s+/)[0]
                  }?`
                : "?"}
            </span>
          </button>

          <button
            type="button"
            className={styles.quickImageButton}
            onClick={() => {
              setExpanded(true);

              fileInputRef.current?.click();
            }}
            aria-label="Choose image"
            disabled={loading}
          >
            <ImagePlus size={21} />
          </button>
        </div>

        {/* EXPANDED AREA */}
        {expanded && (
          <div
            className={styles.expandedArea}
          >
            <textarea
              ref={textareaRef}
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => {
                setCaption(
                  e.target.value.slice(
                    0,
                    MAX_CAPTION_LENGTH
                  )
                );

                if (error) {
                  setError("");
                }
              }}
              className={styles.caption}
              rows={3}
              maxLength={
                MAX_CAPTION_LENGTH
              }
              disabled={loading}
            />

            <div
              className={
                styles.captionMeta
              }
            >
              <span>
                Share something meaningful
              </span>

              <span>
                {caption.length}/
                {MAX_CAPTION_LENGTH}
              </span>
            </div>

            {/* IMAGE PREVIEW */}
            {preview && (
              <div
                className={
                  styles.previewWrapper
                }
              >
                <img
                  src={preview}
                  alt="Selected post preview"
                  className={
                    styles.preview
                  }
                />

                <button
                  type="button"
                  className={
                    styles.removeImageButton
                  }
                  onClick={
                    handleRemoveImage
                  }
                  aria-label="Remove selected image"
                  disabled={loading}
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* ERROR */}
            {error && (
              <p
                className={styles.error}
                role="alert"
              >
                {error}
              </p>
            )}

            {/* FOOTER */}
            <div
              className={styles.footer}
            >
              <div
                className={
                  styles.footerLeft
                }
              >
                <button
                  type="button"
                  className={
                    styles.addImageButton
                  }
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={loading}
                >
                  <ImagePlus size={19} />

                  <span>
                    {image
                      ? "Change image"
                      : "Add image"}
                  </span>
                </button>
              </div>

              <div
                className={
                  styles.footerActions
                }
              >
                <button
                  type="button"
                  className={
                    styles.cancelButton
                  }
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    styles.postButton
                  }
                  disabled={
                    loading ||
                    !hasContent ||
                    !image
                  }
                >
                  <Send size={17} />

                  <span>
                    {loading
                      ? "Posting..."
                      : "Post"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={handleImageChange}
        />
      </form>
    </section>
  );
};

export default CreatePost;