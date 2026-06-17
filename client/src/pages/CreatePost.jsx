import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreatePost.css";

function CreatePost() {

  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);


  const handleImageChange = (e) => {

    const file = e.target.files[0];

    if (file) {
      setImage(file);
      setPreview(
        URL.createObjectURL(file)
      );
    }

  };


  const handleCreatePost = async () => {

    if (!image) {
      alert("Please select an image 📷");
      return;
    }

    try {

      setLoading(true);

      const formData = new FormData();

      formData.append(
        "image",
        image
      );

      formData.append(
        "caption",
        caption
      );


      const res = await axios.post(
        "https://pingme-api-new.onrender.com/api/posts/create",
        formData,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );


      alert("Post shared successfully 🚀");

      navigate("/home");


    } catch (error) {

      console.log(
        "CREATE POST ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Failed to create post ❌"
      );

    } finally {

      setLoading(false);

    }

  };


  return (

    <div className="create-container">

      <div className="create-card">

        <h1 className="create-title">
          Create New Post ✨
        </h1>


        <input
          id="post-image"
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageChange}
        />

        <label
          htmlFor="post-image"
          className="upload-box"
        >

          {
            preview ? (

              <img
                src={preview}
                alt="Preview"
                className="preview-image"
              />

            ) : (

              <div className="upload-content">

                <h2>📷</h2>

                <h3>Upload Image</h3>

                <p>
                  Click here to select image
                </p>

              </div>

            )
          }

        </label>


        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) =>
            setCaption(e.target.value)
          }
          maxLength={500}
        />


        <button
          onClick={handleCreatePost}
          disabled={loading}
        >

          {
            loading
              ? "Uploading... ⏳"
              : "Share Post 🚀"
          }

        </button>

      </div>

    </div>

  );

}

export default CreatePost;