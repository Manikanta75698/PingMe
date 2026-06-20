import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import "./CreateStory.css";

function CreateStory() {

  const navigate = useNavigate();

  const [image, setImage] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleImage = (e) => {

    const file =
      e.target.files[0];

    if (!file) return;

    setImage(file);

    setPreview(
      URL.createObjectURL(file)
    );

  };

  const clearStory = () => {

    setImage(null);

    setPreview("");

  };

  const uploadStory =
    async () => {

      if (!image) return;

      try {

        setLoading(true);

        const formData =
          new FormData();

        formData.append(
          "image",
          image
        );

        await axios.post(
          "http://localhost:5000/api/stories/create",
          formData,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        navigate("/home");

      } catch (error) {

        console.log(
          "STORY ERROR:",
          error
        );

      } finally {

        setLoading(false);

      }

    };

  return (
    <div className="story-page">

      <div className="story-card">

        <h2>Create Story</h2>

        {!preview ? (

          <label
            className="story-upload-label"
          >

            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="story-input"
            />

            <div className="story-placeholder">
              📸 Tap To Select Story
            </div>

          </label>

        ) : (

          <div className="story-preview-container">

            <img
              src={preview}
              alt="preview"
              className="story-preview-image"
            />

            <div className="story-actions">

              <button
                className="clear-story-btn"
                onClick={clearStory}
              >
                ❌ Clear
              </button>

              <button
                className="story-btn"
                onClick={uploadStory}
              >
                {
                  loading
                    ? "Uploading..."
                    : "⬆ Upload Story"
                }
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default CreateStory;