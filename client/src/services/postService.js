import api from "./api";

// Get all posts
export const getPosts = async () => {
  const response = await api.get("/posts");
  return response.data;
};

// Create Post
export const createPost =
  async (formData) => {
    if (
      !(formData instanceof FormData)
    ) {
      throw new Error(
        "Invalid post data"
      );
    }

    const response =
      await api.post(
        "/posts/create",
        formData,
        {
          timeout: 90000,
        }
      );

    return response.data;
  };

// Like post
export const likePost = async (postId) => {
  const response = await api.put(`/posts/like/${postId}`);
  return response.data;
};

// Unlike post
export const unlikePost = async (postId) => {
  const response = await api.put(`/posts/unlike/${postId}`);
  return response.data;
};

// Save Post
export const savePost = async (postId) => {
  const response = await api.put(`/posts/save/${postId}`);
  return response.data;
};

// Unsave Post
export const unsavePost = async (postId) => {
  const response = await api.put(`/posts/unsave/${postId}`);
  return response.data;
};

// Get Comments
export const getComments = async (postId) => {
  const response = await api.get(`/posts/comments/${postId}`);
  return response.data;
};

// Add Comment
export const commentPost = async (postId, text) => {
  const response = await api.post(`/posts/comment/${postId}`, {
    text,
  });

  return response.data;
};

// Get User Posts
export const getUserPosts = async (username) => {
  const response = await api.get(
    `/posts/user/${username}`
  );

  return response.data;
};

// Get Saved Posts

export const getSavedPosts =
  async () => {
    const response = await api.get(
      "/posts/saved"
    );

    return response.data;
  };


// Update Post Caption
export const updatePostCaption = async (
  postId,
  caption
) => {
  const normalizedCaption =
    typeof caption === "string"
      ? caption.trim()
      : "";

  if (!postId) {
    throw new Error(
      "Post ID is required"
    );
  }

  if (
    normalizedCaption.length >
    2200
  ) {
    throw new Error(
      "Caption cannot exceed 2200 characters"
    );
  }

  const response =
    await api.patch(
      `/posts/${postId}/caption`,
      {
        caption:
          normalizedCaption,
      }
    );

  return response.data;
};

// Delete Post
export const deletePost = async (postId) => {
  const response = await api.delete(
    `/posts/${postId}`
  );

  return response.data;
};