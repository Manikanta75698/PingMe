import api from "./api";

const STORY_TIMEOUT = 90000;

const normalizeId = (value) =>
  String(
    value?._id ??
    value?.id ??
    value ??
    ""
  ).trim();

/* =========================
   GET ACTIVE STORIES
========================= */

export const getStories = async () => {
  const response = await api.get(
    "/stories"
  );

  if (
    !response?.data ||
    typeof response.data !==
    "object"
  ) {
    throw new Error(
      "Invalid stories response"
    );
  }

  return response.data;
};

/* =========================
   CREATE STORY
========================= */

export const createStory = async (
  file
) => {
  if (
    !(file instanceof File)
  ) {
    throw new Error(
      "Please select a valid image"
    );
  }

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "Only image files are allowed"
    );
  }

  const maximumFileSize =
    5 * 1024 * 1024;

  if (
    file.size >
    maximumFileSize
  ) {
    throw new Error(
      "Story image must be smaller than 5MB"
    );
  }

  const formData =
    new FormData();

  formData.append(
    "storyImage",
    file
  );

  const response = await api.post(
    "/stories/create",
    formData,
    {
      timeout:
        STORY_TIMEOUT,
    }
  );

  if (
    !response?.data?.story
  ) {
    throw new Error(
      "Invalid story upload response"
    );
  }

  return response.data;
};

/* =========================
   MARK STORY AS VIEWED
========================= */

export const viewStory = async (
  storyId
) => {
  const normalizedStoryId =
    normalizeId(storyId);

  if (!normalizedStoryId) {
    throw new Error(
      "Story ID is required"
    );
  }

  const response = await api.put(
    `/stories/view/${encodeURIComponent(
      normalizedStoryId
    )}`
  );

  return response.data;
};

/* =========================
   DELETE STORY
========================= */

export const deleteStory = async (
  storyId
) => {
  const normalizedStoryId =
    normalizeId(storyId);

  if (!normalizedStoryId) {
    throw new Error(
      "Story ID is required"
    );
  }

  const response = await api.delete(
    `/stories/${encodeURIComponent(
      normalizedStoryId
    )}`
  );

  return response.data;
};