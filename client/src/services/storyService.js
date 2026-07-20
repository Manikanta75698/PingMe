import api from "./api";

const STORY_TIMEOUT = 90000;

const normalizeId = (value) =>
  String(
    value?._id ??
    value?.id ??
    value ??
    ""
  ).trim();

export const getStories = async () => {
  const response = await api.get("/stories");
  return response.data;
};

export const createStory = async (file) => {
  if (!(file instanceof File)) {
    throw new Error("Please select a valid image");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Story image must be smaller than 5MB");
  }

  const formData = new FormData();
  formData.append("storyImage", file);

  const response = await api.post(
    "/stories/create",
    formData,
    { timeout: STORY_TIMEOUT }
  );

  return response.data;
};

export const viewStory = async (storyId) => {
  const id = normalizeId(storyId);
  if (!id) throw new Error("Story ID is required");

  const response = await api.put(
    `/stories/view/${encodeURIComponent(id)}`
  );

  return response.data;
};

export const getStoryViewers = async (storyId) => {
  const id = normalizeId(storyId);
  if (!id) throw new Error("Story ID is required");

  const response = await api.get(
    `/stories/${encodeURIComponent(id)}/viewers`
  );

  return response.data;
};

export const deleteStory = async (storyId) => {
  const id = normalizeId(storyId);
  if (!id) throw new Error("Story ID is required");

  const response = await api.delete(
    `/stories/${encodeURIComponent(id)}`
  );

  return response.data;
};
